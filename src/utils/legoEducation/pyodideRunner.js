/**
 * Pyodide runner — off-main-thread Python for LEGO Education mode.
 *
 * Pyodide runs in a dedicated Web Worker (/pyodideWorker.js) so that
 * synchronous user code (`time.sleep`, long loops) never freezes the UI.
 * Bluetooth instances still live on the main thread; the worker calls back
 * via a SharedArrayBuffer RPC channel set up by legoBridge.js.
 *
 * Public surface is unchanged from the old main-thread runner:
 *   ensurePyodide({ onStdout, onStderr })   — lazy init
 *   runPython(code)                         — run a block
 *   isPyodideReady()                        — UI gating
 *   interruptPython()                       — raise KeyboardInterrupt
 */

import {
  installBridgeOnWorker,
  signalPythonInterrupt,
  clearPythonInterrupt,
  pauseBridge,
  resumeBridge,
  disposeBridge,
} from './legoBridge.js';

const PYODIDE_VERSION = 'v0.26.4';
const PYODIDE_INDEX = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;

let worker = null;
let readyPromise = null;
let ready = false;

let currentStdout = null;
let currentStderr = null;

let runResolver = null;
let runRejecter = null;
let currentRun = null;

function handleWorkerMessage(ev) {
  const msg = ev.data || {};
  switch (msg.type) {
    case 'stdout':
      if (currentStdout) currentStdout(msg.data);
      break;
    case 'stderr':
      if (currentStderr) currentStderr(msg.data);
      break;
    case 'run-done':
      if (runResolver) {
        const resolve = runResolver;
        runResolver = runRejecter = null;
        resolve();
      }
      break;
    case 'run-error':
      if (runRejecter) {
        const reject = runRejecter;
        runResolver = runRejecter = null;
        reject(new Error(msg.error));
      }
      break;
    // 'ready' / 'init-error' / 'ble-rpc' are handled by the init promise
    // and the bridge respectively.
    default:
      break;
  }
}

function spawnWorker() {
  if (readyPromise) return readyPromise;

  worker = new Worker('/pyodideWorker.js');
  installBridgeOnWorker(worker);
  worker.addEventListener('message', handleWorkerMessage);
  worker.addEventListener('error', (ev) => {
    if (currentStderr) currentStderr(`Pyodide worker error: ${ev.message}\n`);
  });

  readyPromise = new Promise((resolve, reject) => {
    const onInitMessage = (ev) => {
      const msg = ev.data || {};
      if (msg.type === 'ready') {
        worker.removeEventListener('message', onInitMessage);
        ready = true;
        resolve();
      } else if (msg.type === 'init-error') {
        worker.removeEventListener('message', onInitMessage);
        reject(new Error(msg.error));
      }
    };
    worker.addEventListener('message', onInitMessage);
    worker.postMessage({ type: 'init', indexURL: PYODIDE_INDEX });
  }).catch((err) => {
    // Allow retry on failure.
    teardownWorker();
    throw err;
  });

  return readyPromise;
}

function teardownWorker() {
  if (worker) {
    try { worker.terminate(); } catch {}
  }
  worker = null;
  readyPromise = null;
  ready = false;
  if (runRejecter) {
    const reject = runRejecter;
    runResolver = runRejecter = null;
    reject(new Error('Pyodide worker terminated'));
  }
  currentRun = null;
  clearPythonInterrupt();
  disposeBridge();
}

/**
 * Lazy-load Pyodide (in its worker) and install the stdout/stderr callbacks.
 * Safe to call multiple times — repeated calls just refresh the callbacks.
 */
export async function ensurePyodide({ onStdout, onStderr } = {}) {
  if (onStdout) currentStdout = onStdout;
  if (onStderr) currentStderr = onStderr;
  return spawnWorker();
}

/**
 * Send `code` to the worker and resolve once execution finishes.
 *
 * If a previous run is still in flight, we interrupt it first and wait
 * for it to unwind before starting the new one. This keeps the UI
 * responsive when the user rapidly clicks Run twice.
 */
export async function runPython(code) {
  if (!worker || !readyPromise) {
    throw new Error('Pyodide worker is not initialised. Call ensurePyodide() first.');
  }
  await readyPromise;

  // A previous run is still going — raise KeyboardInterrupt in it and
  // wait for the worker to report back (success or error) before we
  // queue the new run.
  if (currentRun) {
    signalPythonInterrupt();
    try { await currentRun; } catch { /* expected — interrupted */ }
  }

  // Clear the interrupt flag before every run. Pyodide leaves the byte set
  // to 2 after firing KeyboardInterrupt, so without this the next run
  // raises immediately inside the parser.
  clearPythonInterrupt();
  // The Stop button may have paused the bridge — re-enable device RPCs
  // so the new script can talk to the hardware.
  resumeBridge();

  currentRun = new Promise((resolve, reject) => {
    runResolver = resolve;
    runRejecter = reject;
    worker.postMessage({ type: 'run', code });
  });
  try {
    return await currentRun;
  } finally {
    currentRun = null;
  }
}

export function isPyodideReady() {
  return ready;
}

/**
 * Ask the running Python script to stop. This sets Pyodide's interrupt
 * buffer which raises KeyboardInterrupt at the next interpreter checkpoint.
 * The current BLE RPC (if any) will finish first — they're short-lived.
 */
export function interruptPython() {
  signalPythonInterrupt();
}

/**
 * Immediately reject every further BLE RPC that Python tries to make.
 * Use together with interruptPython() so the running script can't queue
 * more motor_run calls while it's unwinding.
 */
export function freezeBridge() {
  pauseBridge();
}

/**
 * Hard-reset: kill the worker entirely. Used for "switch hardware" cleanup.
 * Next ensurePyodide() call will spin up a fresh worker.
 */
export function terminatePyodide() {
  teardownWorker();
}
