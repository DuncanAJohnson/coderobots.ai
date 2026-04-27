/**
 * LEGO Education device registry.
 *
 * Manages window.LEGO_DEVICES — the shared slot table that both the JS
 * connect UI and the in-browser Python wrapper (legoeducation.py) read
 * from. Each kind holds a Map<string id, instance> so we can have multiple
 * devices of the same type. The "id" is a user-assigned string ("1", "2",
 * "left", "duncan", …) that students reference from Python via le.X(id=…).
 *
 * Display names are persisted in localStorage keyed by the LEGO hardware
 * unique id (the 8-byte device UUID retrieved via device_uuid()), so that
 * the same physical device gets the same id every time it's reconnected.
 *
 * Also lazy-loads /lego-education-ble.js once so that `window.legoeducation`
 * becomes available to the rest of the app.
 */

const SLOT_CLASSES = {
  singlemotor: 'SingleMotor',
  doublemotor: 'DoubleMotor',
  colorsensor: 'ColorSensor',
  controller: 'Controller',
};

export const LEGO_SLOT_NAMES = Object.keys(SLOT_CLASSES);

const STORAGE_KEY = 'coderobots_lego_device_names';

let bleScriptPromise = null;
const listeners = new Set();

function ensureSlots() {
  if (!window.LEGO_DEVICES) {
    window.LEGO_DEVICES = {
      singlemotor: new Map(),
      doublemotor: new Map(),
      colorsensor: new Map(),
      controller: new Map(),
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
 */
export function preloadLegoLibrary() {
  ensureSlots();
  return loadBleLibrary().catch((err) => {
    console.error('[legoDevices] preload failed:', err);
  });
}

// ---------------------------------------------------------------------------
// localStorage persistence — { hardwareId: { kind, name } }
// ---------------------------------------------------------------------------

function loadStoredNames() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch (e) {
    console.warn('[legoDevices] loadStoredNames failed:', e);
    return {};
  }
}

function writeStoredNames(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('[legoDevices] writeStoredNames failed:', e);
  }
}

function saveStoredName(hardwareId, kind, name) {
  if (!hardwareId) return;
  const all = loadStoredNames();
  all[hardwareId] = { kind, name };
  writeStoredNames(all);
}

// ---------------------------------------------------------------------------
// Hardware id helpers
// ---------------------------------------------------------------------------

function formatHardwareId(uuidBytes) {
  if (!uuidBytes || !uuidBytes.length) return '';
  const hex = Array.from(uuidBytes, (b) => b.toString(16).padStart(2, '0').toUpperCase()).join('');
  // Group into 4-char chunks separated by spaces, e.g. "335F 2537 004B 1200".
  return hex.match(/.{1,4}/g).join(' ');
}

async function fetchHardwareId(instance) {
  try {
    const r = await instance.device_uuid();
    return formatHardwareId(r?.uuid);
  } catch (e) {
    console.warn('[legoDevices] device_uuid failed:', e);
    return '';
  }
}

/**
 * Pick a default user id for a freshly-connected device of `kind` whose
 * hardware id has no stored name. We use sequential numeric strings ("1",
 * "2", …) and skip any number already in use either by a currently-connected
 * device of this kind OR by a remembered (persisted) device of this kind.
 */
function nextDefaultName(kind) {
  ensureSlots();
  const used = new Set(window.LEGO_DEVICES[kind].keys());
  const stored = loadStoredNames();
  for (const entry of Object.values(stored)) {
    if (entry?.kind === kind) used.add(entry.name);
  }
  for (let n = 1; n < 1000; n++) {
    const candidate = String(n);
    if (!used.has(candidate)) return candidate;
  }
  return `id_${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Connect a LEGO device of the given kind via Web Bluetooth.
 * MUST be called from a user-gesture handler (click).
 *
 * @param {'singlemotor'|'doublemotor'|'colorsensor'|'controller'} kind
 * @returns {Promise<{ok: boolean, error?: string, name?: string, hardwareId?: string, info?: any}>}
 */
export async function connectDevice(kind) {
  ensureSlots();
  const className = SLOT_CLASSES[kind];
  if (!className) return { ok: false, error: `Unknown device kind: ${kind}` };

  let instance = null;
  try {
    const le = await loadBleLibrary();
    const DeviceClass = le[className];
    if (!DeviceClass) throw new Error(`legoeducation.${className} not found`);

    instance = new DeviceClass();
    const info = await instance.connect();

    const hardwareId = await fetchHardwareId(instance);

    // Decide on the user-facing name: persisted-by-hardware-id, or next free.
    let name;
    if (hardwareId) {
      const stored = loadStoredNames();
      const entry = stored[hardwareId];
      if (entry && entry.kind === kind && entry.name) {
        name = entry.name;
      }
    }
    if (!name) {
      name = nextDefaultName(kind);
      if (hardwareId) saveStoredName(hardwareId, kind, name);
    }

    // If we already have a connected instance under this name (same physical
    // device reconnect race), disconnect the old one first.
    const existing = window.LEGO_DEVICES[kind].get(name);
    if (existing && existing !== instance) {
      try { await existing.disconnect(); } catch { /* ignore */ }
    }

    instance._coderobotsName = name;
    instance._coderobotsHardwareId = hardwareId;
    instance._onDisconnect = () => {
      const cur = window.LEGO_DEVICES[kind].get(name);
      if (cur === instance) {
        window.LEGO_DEVICES[kind].delete(name);
        notify();
      }
    };

    window.LEGO_DEVICES[kind].set(name, instance);
    notify();
    return { ok: true, info, name, hardwareId };
  } catch (err) {
    console.error(`[legoDevices] connect ${kind} failed:`, err);
    if (instance) {
      try { await instance.disconnect(); } catch { /* ignore */ }
    }
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * Disconnect a single named device.
 */
export async function disconnectDevice(kind, name) {
  ensureSlots();
  const map = window.LEGO_DEVICES[kind];
  if (!map) return;
  const inst = map.get(name);
  if (!inst) return;
  try { await inst.disconnect(); } catch (e) { console.warn('disconnect failed', e); }
  map.delete(name);
  notify();
}

/**
 * Rename a connected device. Updates the in-memory Map key and persists the
 * new name against the device's hardware id so future reconnects use it.
 *
 * @returns {{ok: true} | {ok: false, error: string}}
 */
export function renameDevice(kind, oldName, newName) {
  ensureSlots();
  const trimmed = (newName ?? '').trim();
  if (!trimmed) return { ok: false, error: 'Name cannot be empty' };
  if (trimmed.includes(':')) return { ok: false, error: "Name cannot contain ':'" };
  if (trimmed === oldName) return { ok: true };

  const map = window.LEGO_DEVICES[kind];
  if (!map) return { ok: false, error: `Unknown kind: ${kind}` };
  const inst = map.get(oldName);
  if (!inst) return { ok: false, error: `No device with id '${oldName}'` };
  if (map.has(trimmed)) return { ok: false, error: 'in-use' };

  // Rebuild the map preserving insertion order (so "first-of-kind" semantics
  // stay stable across renames).
  const rebuilt = new Map();
  for (const [k, v] of map.entries()) {
    if (k === oldName) rebuilt.set(trimmed, inst);
    else rebuilt.set(k, v);
  }
  window.LEGO_DEVICES[kind] = rebuilt;

  inst._coderobotsName = trimmed;

  // Update both the _onDisconnect closure and the persisted name.
  inst._onDisconnect = () => {
    const cur = window.LEGO_DEVICES[kind].get(trimmed);
    if (cur === inst) {
      window.LEGO_DEVICES[kind].delete(trimmed);
      notify();
    }
  };
  if (inst._coderobotsHardwareId) {
    saveStoredName(inst._coderobotsHardwareId, kind, trimmed);
  }

  notify();
  return { ok: true };
}

/**
 * Disconnect every device across every kind (used when leaving LEGO mode).
 */
export async function disconnectAll() {
  ensureSlots();
  const tasks = [];
  for (const kind of LEGO_SLOT_NAMES) {
    const map = window.LEGO_DEVICES[kind];
    for (const inst of map.values()) {
      tasks.push(inst.disconnect().catch((e) => console.warn('disconnectAll', kind, e)));
    }
    map.clear();
  }
  await Promise.all(tasks);
  notify();
}

/**
 * Best-effort halt for every connected motor/movement device.
 */
export async function stopAllMotion() {
  ensureSlots();
  const tasks = [];
  for (const sm of window.LEGO_DEVICES.singlemotor.values()) {
    if (sm?.connected) tasks.push(sm.motor_stop({ blocking: false }).catch(() => {}));
  }
  for (const dm of window.LEGO_DEVICES.doublemotor.values()) {
    if (!dm?.connected) continue;
    tasks.push(dm.movement_stop({ blocking: false }).catch(() => {}));
    tasks.push(dm.motor_stop({ motor: 2, blocking: false }).catch(() => {}));
  }
  await Promise.all(tasks);
}

/**
 * Snapshot of current connection state, suitable for rendering UI.
 *
 *   { singlemotor: [{ name, hardwareId, connected }, ...], ... }
 */
export function getConnectionState() {
  ensureSlots();
  const state = {};
  for (const kind of LEGO_SLOT_NAMES) {
    const list = [];
    for (const [name, inst] of window.LEGO_DEVICES[kind].entries()) {
      list.push({
        name,
        hardwareId: inst?._coderobotsHardwareId || '',
        connected: !!(inst && inst.connected),
      });
    }
    state[kind] = list;
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

/**
 * Lookup helper used by the RPC bridge. With no `id`, returns the first
 * inserted device of this kind (backwards compatible with single-device
 * student code: `motor = le.SingleMotor()`).
 */
export function findDeviceInstance(kind, id) {
  ensureSlots();
  const map = window.LEGO_DEVICES[kind];
  if (!map || map.size === 0) return null;
  if (id == null) return map.values().next().value || null;
  return map.get(id) || null;
}
