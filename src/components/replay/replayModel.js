/**
 * Replay data model.
 *
 * Turns a merged per-session CSV into a list of immutable "frames" — one per
 * event — that fully describe the editor/chat state at that point in the replay.
 *
 * Format-specific parsing lives in ./formats/ (one adapter per editor
 * generation). Each adapter normalizes its CSV into canonical events + a
 * capability `profile`; everything here operates on that canonical shape, so it
 * never needs to know which editor version produced the file.
 *
 * Everything is pure and runs entirely in the browser; no network.
 */

import { splitCsvRows, isBlank } from './formats/csvRows';
import { selectFormat } from './formats';

// Re-exported for back-compat with any importer of the old model API.
export { isBlank };

const DEFAULT_CODE_TAB = 'Code Tab';
const DEFAULT_CHAT_TAB = 'Chat';

/**
 * Parse the raw CSV text into { meta, events, profile } via the matching format
 * adapter. `events` are canonical events (see ./formats/canonical.js).
 */
export function parseSessionCsv(text) {
  const { columns, metaByKey, eventRows } = splitCsvRows(text);
  const adapter = selectFormat({ columns, metaByKey });
  const { meta, events, profile } = adapter.parse({ columns, eventRows, metaByKey });

  if (events.length === 0) {
    throw new Error('This session CSV has no events to replay.');
  }

  return { meta, events, profile };
}

/**
 * Line-level diff. Returns a Set of 1-based line numbers in `next` that were
 * added or changed relative to `prev` (used to paint changed code lines blue).
 */
export function diffLines(prev, next) {
  if (prev === next) return new Set();
  const a = prev ? prev.split('\n') : [];
  const b = next ? next.split('\n') : [];
  const m = a.length;
  const n = b.length;

  // LCS table over lines.
  const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const changed = new Set();
  let i = 0;
  let j = 0;
  while (j < n) {
    if (i < m && a[i] === b[j]) {
      i++;
      j++;
    } else if (i < m && dp[i + 1][j] >= dp[i][j + 1]) {
      i++; // line only in `prev` (removed)
    } else {
      changed.add(j + 1); // line added/changed in `next`
      j++;
    }
  }
  return changed;
}

function describeEvent(type, fields) {
  switch (type) {
    case 'code':
      return `Code change in "${fields.tabName}"${
        fields.saveSource ? ` (${fields.saveSource})` : ''
      }`;
    case 'console':
      return `Console output${fields.saveSource ? ` (${fields.saveSource})` : ''}`;
    case 'interaction':
      return `Button pressed: ${fields.buttonName || 'unknown'}`;
    case 'message':
      if (fields.role === 'system') return 'System priming message';
      return `New message from ${
        fields.role === 'user' ? 'User' : 'AI Bot'
      } in "${fields.tabName}"`;
    default:
      return type || 'event';
  }
}

/**
 * Build one frame per event. Each frame is a self-contained snapshot of what
 * the replay UI should show at that step.
 *
 * Tabs are keyed by name (canonical events carry no tab IDs); same-named tabs
 * merge, and formats without tabs collapse onto a single implicit tab.
 */
export function buildFrames(events) {
  const codeTabs = new Map(); // name -> latest content
  const convs = new Map(); // name -> messages[]
  let activeCodeTab = null;
  let activeChatTab = null;
  let consoleText = '';

  const frames = [];

  for (const ev of events) {
    const type = ev.type;
    const timestamp = ev.timestamp || '';

    let changedLines = null;
    let codeTabSwitched = false;
    let chatTabSwitched = false;
    let buttonName = '';
    let newMessageIndex = -1;
    const descFields = {};

    if (type === 'code') {
      const name = !isBlank(ev.codeTabName) ? ev.codeTabName : DEFAULT_CODE_TAB;
      const content = ev.code || '';
      const prevContent = codeTabs.get(name) ?? '';
      changedLines = diffLines(prevContent, content);
      codeTabs.set(name, content);
      codeTabSwitched = activeCodeTab !== name;
      activeCodeTab = name;
      descFields.tabName = name;
      descFields.saveSource = ev.codeSaveSource || '';
    } else if (type === 'console') {
      consoleText = ev.console || '';
      descFields.saveSource = ev.consoleSaveSource || '';
    } else if (type === 'interaction') {
      buttonName = ev.buttonName || '';
      descFields.buttonName = buttonName;
    } else if (type === 'message') {
      const name = !isBlank(ev.chatTabName) ? ev.chatTabName : DEFAULT_CHAT_TAB;
      const author = (ev.messageAuthor || '').toLowerCase();
      const role = author === 'user' ? 'user' : author === 'system' ? 'system' : 'bot';
      const msg = {
        role,
        content: ev.message || '',
        aiModel: ev.aiModel || '',
        codingLevel: ev.codingLevel || '',
        promptTokens: ev.promptTokens || '',
        completionTokens: ev.completionTokens || '',
        contextAttached: !!(ev.codeContextAttached || ev.consoleContextAttached),
      };
      if (!convs.has(name)) convs.set(name, []);
      const list = convs.get(name);
      list.push(msg);
      newMessageIndex = list.length - 1;
      chatTabSwitched = activeChatTab !== name;
      activeChatTab = name;
      descFields.tabName = name;
      descFields.role = role;
    }

    frames.push({
      // Editor state
      codeTabs: Array.from(codeTabs, ([name, content]) => ({ name, content })),
      activeCodeTab,
      consoleText,
      // Chat state (materialized snapshot up to this event)
      conversations: Array.from(convs, ([name, list]) => ({
        name,
        messages: list.slice(),
      })),
      activeChatTab,
      // Current-event metadata + highlight hints
      event: {
        type,
        timestamp,
        buttonName,
        description: describeEvent(type, descFields),
      },
      highlightKind: type,
      changedLines, // Set | null (only for code events)
      codeTabSwitched,
      chatTabSwitched,
      newMessageIndex, // index within the active chat tab, or -1
    });
  }

  return frames;
}

/** Parse + build in one call. Returns { meta, events, profile, frames }. */
export function loadSession(text) {
  const { meta, events, profile } = parseSessionCsv(text);
  const frames = buildFrames(events);
  return { meta, events, profile, frames };
}
