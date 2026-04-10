/**
 * LEGO Education device registry.
 *
 * Manages window.LEGO_DEVICES — the shared slot table that both the JS
 * connect buttons and the in-browser Python wrapper (legoeducation.py) read
 * from. Also lazy-loads /lego-education-ble.js once so that `window.legoeducation`
 * becomes available to the rest of the app.
 */

const SLOT_CLASSES = {
  singlemotor: 'SingleMotor',
  doublemotor: 'DoubleMotor',
  colorsensor: 'ColorSensor',
  controller: 'Controller',
};

export const LEGO_SLOT_NAMES = Object.keys(SLOT_CLASSES);

let bleScriptPromise = null;
const listeners = new Set();

function ensureSlots() {
  if (!window.LEGO_DEVICES) {
    window.LEGO_DEVICES = {
      singlemotor: null,
      doublemotor: null,
      colorsensor: null,
      controller: null,
    };
  }
}

function notify() {
  for (const fn of listeners) {
    try { fn(getConnectionState()); } catch (e) { console.warn(e); }
  }
}

function loadBleLibrary() {
  if (window.legoeducation) return Promise.resolve(window.legoeducation);
  if (bleScriptPromise) return bleScriptPromise;

  bleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-lego-ble]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.legoeducation));
      existing.addEventListener('error', () => reject(new Error('Failed to load lego-education-ble.js')));
      return;
    }
    const script = document.createElement('script');
    script.src = '/lego-education-ble.js';
    script.async = true;
    script.dataset.legoBle = '1';
    script.addEventListener('load', () => {
      if (window.legoeducation) {
        resolve(window.legoeducation);
      } else {
        reject(new Error('lego-education-ble.js loaded but window.legoeducation is undefined'));
      }
    });
    script.addEventListener('error', () => reject(new Error('Failed to load /lego-education-ble.js')));
    document.head.appendChild(script);
  });
  return bleScriptPromise;
}

/**
 * Begin loading the BLE library immediately (call when entering LEGO mode).
 * Safe to call multiple times.
 */
export function preloadLegoLibrary() {
  ensureSlots();
  return loadBleLibrary().catch((err) => {
    console.error('[legoDevices] preload failed:', err);
  });
}

/**
 * Connect one of the four LEGO devices via Web Bluetooth.
 * MUST be called synchronously from a user-gesture handler (click).
 *
 * @param {'singlemotor'|'doublemotor'|'colorsensor'|'controller'} kind
 * @returns {Promise<{ok: boolean, error?: string, info?: any}>}
 */
export async function connectDevice(kind) {
  ensureSlots();
  const className = SLOT_CLASSES[kind];
  if (!className) return { ok: false, error: `Unknown device kind: ${kind}` };

  try {
    const le = await loadBleLibrary();
    const DeviceClass = le[className];
    if (!DeviceClass) throw new Error(`legoeducation.${className} not found`);

    // If the slot already holds a connected instance, bail out as success.
    const existing = window.LEGO_DEVICES[kind];
    if (existing && existing.connected) {
      return { ok: true, info: null };
    }

    const instance = new DeviceClass();
    instance._onDisconnect = () => {
      if (window.LEGO_DEVICES[kind] === instance) {
        window.LEGO_DEVICES[kind] = null;
        notify();
      }
    };
    const info = await instance.connect();
    window.LEGO_DEVICES[kind] = instance;
    notify();
    return { ok: true, info };
  } catch (err) {
    console.error(`[legoDevices] connect ${kind} failed:`, err);
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * Disconnect one device, closing its BT connection.
 */
export async function disconnectDevice(kind) {
  ensureSlots();
  const inst = window.LEGO_DEVICES[kind];
  if (!inst) return;
  try { await inst.disconnect(); } catch (e) { console.warn('disconnect failed', e); }
  window.LEGO_DEVICES[kind] = null;
  notify();
}

/**
 * Disconnect all four slots (used when the user switches away from LEGO mode).
 */
export async function disconnectAll() {
  ensureSlots();
  for (const kind of LEGO_SLOT_NAMES) {
    const inst = window.LEGO_DEVICES[kind];
    if (!inst) continue;
    try { await inst.disconnect(); } catch (e) { console.warn('disconnectAll', kind, e); }
    window.LEGO_DEVICES[kind] = null;
  }
  notify();
}

/**
 * Best-effort motor/movement halt across every connected device.
 * Called by the "Stop" button so a runaway script can be halted.
 */
export async function stopAllMotion() {
  ensureSlots();
  const tasks = [];
  const sm = window.LEGO_DEVICES.singlemotor;
  if (sm?.connected) tasks.push(sm.motor_stop({ blocking: false }).catch(() => {}));
  const dm = window.LEGO_DEVICES.doublemotor;
  if (dm?.connected) {
    tasks.push(dm.movement_stop({ blocking: false }).catch(() => {}));
    tasks.push(dm.motor_stop({ motor: 2, blocking: false }).catch(() => {}));
  }
  await Promise.all(tasks);
}

/**
 * Snapshot of current connection state.
 */
export function getConnectionState() {
  ensureSlots();
  const state = {};
  for (const kind of LEGO_SLOT_NAMES) {
    const inst = window.LEGO_DEVICES[kind];
    state[kind] = !!(inst && inst.connected);
  }
  return state;
}

/**
 * Subscribe to connection-state changes. Returns an unsubscribe fn.
 */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
