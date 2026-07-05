/**
 * Main-thread side of the LEGO Education Pyodide bridge.
 *
 * The Pyodide worker holds all Python state, but BLE devices live on the
 * main thread (inside `window.LEGO_DEVICES`). When Python calls a method on
 * one of those devices, the worker posts a JSON request to this module and
 * blocks on a shared Int32Array via `Atomics.wait`. Here we:
 *
 *   1. Parse the request
 *   2. Dispatch it to the right device instance
 *   3. Serialise the result into the shared payload buffer
 *   4. Flip the flag byte and call `Atomics.notify` to wake the worker
 *
 * The main thread never blocks — all of the work above runs inside a normal
 * `message` event handler. The shared buffers act purely as a return-value
 * channel.
 */

import { findDeviceInstance } from './legoDevices.js';

const FLAG_BYTES = 4;              // single Int32 slot
const DATA_BYTES = 128 * 1024;     // 128 KB is plenty for our JSON payloads
const INTERRUPT_BYTES = 1;         // Pyodide interrupt signal byte
const HEADER_BYTES = 4;            // uint32 length prefix on the data buffer

// Lazily-allocated SharedArrayBuffers. One set per page load — re-used if a
// second worker is ever started.
let flagBuf = null;
let dataBuf = null;
let interruptBuf = null;
let flagView = null;
let dataView = null;
let interruptView = null;
let installedOnWorker = null;

// When the user hits Stop we flip this to true so that every subsequent
// BLE RPC from the Python worker returns an error immediately, without
// touching the real device. This prevents queued-up motor_run commands
// from landing after our motor_stop and restarting the motor. Cleared
// again at the start of the next runPython() call.
let bridgePaused = false;

function ensureBuffers() {
  if (flagBuf) return;
  if (typeof SharedArrayBuffer === 'undefined') {
    throw new Error(
      'SharedArrayBuffer is unavailable. This page must be cross-origin isolated ' +
      '(COOP: same-origin, COEP: require-corp).'
    );
  }
  flagBuf = new SharedArrayBuffer(FLAG_BYTES);
  dataBuf = new SharedArrayBuffer(DATA_BYTES);
  interruptBuf = new SharedArrayBuffer(INTERRUPT_BYTES);
  flagView = new Int32Array(flagBuf);
  dataView = new Uint8Array(dataBuf);
  interruptView = new Uint8Array(interruptBuf);
}

// Encode a JS value as something structurally cloneable (and JSON-friendly).
// We strip functions, prototype chains, and stop after a few levels — BLE
// notification state objects have a flat `{ color, reflection, … }` shape,
// so this is more than enough.
function serializeValue(value, depth = 0) {
  if (value === null || value === undefined) return null;
  const t = typeof value;
  if (t === 'number' || t === 'string' || t === 'boolean') return value;
  if (t === 'function' || t === 'symbol') return null;
  if (depth > 4) return null;
  if (Array.isArray(value)) {
    return value.map((v) => serializeValue(v, depth + 1));
  }
  if (t === 'object') {
    const out = {};
    for (const key in value) {
      try {
        const v = value[key];
        if (typeof v === 'function') continue;
        out[key] = serializeValue(v, depth + 1);
      } catch {
        // getter threw — skip
      }
    }
    return out;
  }
  return null;
}

function writeSharedResponse(obj) {
  const json = JSON.stringify(obj);
  const encoded = new TextEncoder().encode(json);
  const view = new DataView(dataBuf);
  if (encoded.length > dataView.length - HEADER_BYTES) {
    const fallback = new TextEncoder().encode(
      JSON.stringify({ ok: false, error: 'bridge response too large' })
    );
    view.setUint32(0, fallback.length, true);
    dataView.set(fallback, HEADER_BYTES);
  } else {
    view.setUint32(0, encoded.length, true);
    dataView.set(encoded, HEADER_BYTES);
  }
  Atomics.store(flagView, 0, 1);
  Atomics.notify(flagView, 0);
}

async function dispatchRpc(req) {
  // `has`/`get` stay functional while paused — they're read-only and let
  // the script's error handlers query state as they unwind. Only device
  // *commands* are short-circuited.
  if (bridgePaused && req.kind === 'call') {
    throw new Error('Programmet blev stoppet.');
  }

  const inst = findDeviceInstance(req.slot, req.id);
  const idSuffix = req.id != null ? ` (id='${req.id}')` : '';

  if (req.kind === 'has') {
    return { ok: true, value: !!(inst && inst.connected) };
  }

  if (!inst) {
    throw new Error(`LEGO device '${req.slot}'${idSuffix} er ikke forbundet`);
  }

  if (req.kind === 'call') {
    const method = inst[req.method];
    if (typeof method !== 'function') {
      throw new Error(`Metoden '${req.method}' findes ikke på '${req.slot}'${idSuffix}`);
    }
    const args = [];
    if (Array.isArray(req.positional)) args.push(...req.positional);
    // Always append an options object so the JS library's destructured
    // `options = {}` parameter receives real kwargs.
    args.push(req.opts || {});
    let result = method.apply(inst, args);
    if (result && typeof result.then === 'function') {
      result = await result;
    }
    return { ok: true, value: serializeValue(result) };
  }

  if (req.kind === 'get') {
    let v = inst;
    const path = Array.isArray(req.path) ? req.path : [];
    for (const key of path) {
      if (v === null || v === undefined) break;
      v = v[key];
    }
    return { ok: true, value: serializeValue(v) };
  }

  throw new Error(`unknown bridge request kind: ${req.kind}`);
}

async function handleRpcMessage(reqJson) {
  let response;
  try {
    const req = JSON.parse(reqJson);
    response = await dispatchRpc(req);
  } catch (err) {
    response = { ok: false, error: String(err?.message || err) };
  }
  writeSharedResponse(response);
}

/**
 * Attach the bridge to a freshly-created Pyodide worker. Sends the shared
 * buffers over and wires up the message listener that services RPC
 * requests. Must be called before the worker is told to `init` Pyodide.
 */
export function installBridgeOnWorker(worker) {
  ensureBuffers();
  installedOnWorker = worker;
  worker.postMessage({
    type: 'init-bridge',
    flag: flagBuf,
    data: dataBuf,
    interrupt: interruptBuf,
  });
  worker.addEventListener('message', (ev) => {
    if (ev.data?.type === 'ble-rpc') {
      handleRpcMessage(ev.data.req);
    }
  });
}

/**
 * Raise KeyboardInterrupt in the running Python script.
 *
 * Pyodide polls the first byte of the interrupt buffer between bytecode
 * instructions; writing 2 (SIGINT) causes the interpreter to raise
 * KeyboardInterrupt on the next checkpoint. `time.sleep` is interruptible.
 *
 * We use Atomics.store on a Uint8 view (Atomics needs an Int/Uint typed
 * array — Uint8Array is fine) to guarantee a memory fence so the worker
 * sees the write without caching.
 */
export function signalPythonInterrupt() {
  if (interruptView) Atomics.store(interruptView, 0, 2);
}

/**
 * Reject any further device-command RPCs from the Python worker. Used
 * by the Stop button so queued-up motor_run calls can't restart the
 * motor after our motor_stop lands.
 */
export function pauseBridge() {
  bridgePaused = true;
}

/**
 * Re-enable device-command RPCs. Call before starting a new runPython().
 */
export function resumeBridge() {
  bridgePaused = false;
}

/**
 * Reset the interrupt byte so the next Python run starts cleanly.
 *
 * Pyodide does NOT auto-clear the buffer after firing, so if we don't
 * reset it here the next runPythonAsync() raises KeyboardInterrupt
 * immediately (often inside the parser, before the student code runs).
 */
export function clearPythonInterrupt() {
  if (interruptView) Atomics.store(interruptView, 0, 0);
}

/**
 * Release references to the current bridge. Called when the worker is
 * being torn down (e.g. hardware switch or hard reset).
 */
export function disposeBridge() {
  installedOnWorker = null;
}

export function isBridgeInstalled() {
  return installedOnWorker !== null;
}
