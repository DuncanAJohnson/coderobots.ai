/**
 * Browser-local "database" for no-telemetry instances.
 *
 * One namespaced localStorage key holds JSON tables mirroring the Supabase
 * schema (src/services/dbSchemas.js): sessions, conversations, messages,
 * code, code_snapshots, console, interactions. Rows carry auto-increment
 * integer ids like their Postgres counterparts so callers can't tell the
 * backends apart.
 *
 * All reads go through an in-memory cache (the 1s-debounced code autosave
 * must not re-parse the whole blob per keystroke); writes mutate the cache
 * and flush. localStorage is ~5MB, so history tables are capped and a
 * QuotaExceededError triggers progressively destructive trims.
 */

const STORAGE_KEY = 'coderobots_local_db_v1';

export const LOCAL_USER_ID = 'local';

const TABLES = [
  'sessions',
  'conversations',
  'messages',
  'code',
  'code_snapshots',
  'console',
  'interactions',
];

// Per-table history caps, enforced on insert.
const SNAPSHOTS_PER_CODE = 20;
const CONSOLE_PER_SESSION = 50;
const INTERACTIONS_MAX = 200;
const MESSAGES_MAX = 2000;

let cache = null;

function emptyDb() {
  const db = { meta: { nextId: 1 } };
  for (const table of TABLES) db[table] = [];
  return db;
}

function loadDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDb();
    const parsed = JSON.parse(raw);
    // Tolerate older/corrupt blobs: keep what parses, backfill the rest.
    const db = emptyDb();
    if (parsed && typeof parsed === 'object') {
      if (parsed.meta && Number.isInteger(parsed.meta.nextId)) {
        db.meta.nextId = parsed.meta.nextId;
      }
      for (const table of TABLES) {
        if (Array.isArray(parsed[table])) db[table] = parsed[table];
      }
    }
    return db;
  } catch (error) {
    console.error('Local store unreadable, starting fresh:', error);
    return emptyDb();
  }
}

export function getDb() {
  if (!cache) cache = loadDb();
  return cache;
}

export function nowIso() {
  return new Date().toISOString();
}

function isQuotaError(error) {
  return (
    error &&
    (error.name === 'QuotaExceededError' ||
      // Older Firefox
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22)
  );
}

/**
 * Progressively destructive trims when the blob no longer fits. Ordered from
 * least to most painful; each pass drops roughly half of the target table's
 * oldest rows.
 */
function trimForQuota(db, pass) {
  const halve = (table) => {
    const drop = Math.ceil(db[table].length / 2);
    db[table] = db[table].slice(drop);
    return drop > 0;
  };
  switch (pass) {
    case 0:
      return halve('interactions');
    case 1:
      return halve('console');
    case 2:
      return halve('code_snapshots');
    case 3:
      return halve('messages');
    default:
      return false;
  }
}

export function flush() {
  const db = getDb();
  for (let pass = 0; pass <= 4; pass += 1) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      return;
    } catch (error) {
      if (!isQuotaError(error) || pass === 4 || !trimForQuota(db, pass)) {
        console.error('Failed to persist local store:', error);
        return;
      }
      console.warn(`Local store over quota — trimmed history (pass ${pass + 1})`);
    }
  }
}

function nextId(db) {
  const id = db.meta.nextId;
  db.meta.nextId += 1;
  return id;
}

function enforceCaps(db, table, row) {
  if (table === 'code_snapshots') {
    const forCode = db.code_snapshots.filter((r) => r.code_id === row.code_id);
    if (forCode.length > SNAPSHOTS_PER_CODE) {
      const keepIds = new Set(
        forCode.slice(-SNAPSHOTS_PER_CODE).map((r) => r.id)
      );
      db.code_snapshots = db.code_snapshots.filter(
        (r) => r.code_id !== row.code_id || keepIds.has(r.id)
      );
    }
  } else if (table === 'console') {
    const forSession = db.console.filter((r) => r.session_id === row.session_id);
    if (forSession.length > CONSOLE_PER_SESSION) {
      const keepIds = new Set(
        forSession.slice(-CONSOLE_PER_SESSION).map((r) => r.id)
      );
      db.console = db.console.filter(
        (r) => r.session_id !== row.session_id || keepIds.has(r.id)
      );
    }
  } else if (table === 'interactions' && db.interactions.length > INTERACTIONS_MAX) {
    db.interactions = db.interactions.slice(-INTERACTIONS_MAX);
  } else if (table === 'messages' && db.messages.length > MESSAGES_MAX) {
    db.messages = db.messages.slice(-MESSAGES_MAX);
  }
}

/**
 * Insert a row; assigns id + user_id. Returns a copy of the stored row.
 */
export function insertRow(table, row) {
  const db = getDb();
  const stored = { id: nextId(db), user_id: LOCAL_USER_ID, ...row };
  db[table].push(stored);
  enforceCaps(db, table, stored);
  flush();
  return { ...stored };
}

/**
 * Shallow-merge a patch into the row with the given id.
 * Returns a copy of the updated row, or null if not found.
 */
export function updateRow(table, id, patch) {
  const db = getDb();
  const row = db[table].find((r) => r.id === id);
  if (!row) return null;
  Object.assign(row, patch);
  flush();
  return { ...row };
}

export function findRow(table, id) {
  const row = getDb()[table].find((r) => r.id === id);
  return row ? { ...row } : null;
}

/**
 * Select copies of matching rows, sorted by `sortField` (id as tiebreaker so
 * same-millisecond inserts keep insertion order).
 */
export function selectRows(table, predicate, sortField, ascending = true) {
  const rows = getDb()[table]
    .filter(predicate)
    .map((r) => ({ ...r }));
  if (sortField) {
    const dir = ascending ? 1 : -1;
    rows.sort((a, b) => {
      const av = a[sortField] ?? '';
      const bv = b[sortField] ?? '';
      if (av < bv) return -dir;
      if (av > bv) return dir;
      return (a.id - b.id) * dir;
    });
  }
  return rows;
}
