/**
 * Adapter for the legacy `fall-25-en1-editor` export: a 13-column CSV from an
 * editor that had a single code buffer, a single conversation, and no session
 * names. It logged the system priming message as a chat event and carried only
 * boolean "context attached" flags. Schema version 0.
 */

import { zipRow, asBool } from './csvRows';
import { emptyCanonicalEvent } from './canonical';

const profile = {
  schemaVersion: 0,
  formatId: 'legacy-v0',
  label: 'Legacy session export (pre-tabs)',
  hasCodeTabs: false,
  hasChatTabs: false,
  hasSystemMessages: true,
  hasTokenStats: false,
  hasContextContent: false,
};

/** The boolean-flag "Code Context Attached" column paired with the absence of
 *  the current format's "Code Tab Name" column is the unambiguous legacy signature. */
function detect({ columns }) {
  return (
    Array.isArray(columns) &&
    columns.includes('Code Context Attached') &&
    !columns.includes('Code Tab Name')
  );
}

function parse({ columns, eventRows, metaByKey }) {
  // The legacy metadata block only carries Session ID / User ID / Started At.
  const meta = {
    student: '',
    sessionId: metaByKey['Session ID'] || '',
    sessionName: '',
    platform: '',
    startedAt: metaByKey['Started At'] || '',
    lastUpdated: '',
  };

  const events = eventRows.map((row) => {
    const obj = zipRow(columns, row);
    const ev = emptyCanonicalEvent();
    ev.type = obj['Type'] || '';
    ev.timestamp = obj['Timestamp'] || '';
    // No tab columns: leave codeTabName/chatTabName '' so buildFrames applies the
    // single implicit-tab defaults, and the panes hide the tab chrome (hasCodeTabs
    // / hasChatTabs are false).
    ev.code = obj['Code'] || '';
    ev.codeSaveSource = obj['Code Save Source'] || '';
    ev.console = (obj['Console'] || '').replace(/\r\n/g, '\n');
    ev.consoleSaveSource = obj['Console Save Source'] || '';
    ev.buttonName = obj['Button Clicked'] || '';
    ev.messageAuthor = obj['Message Author'] || '';
    ev.message = obj['Message'] || '';
    ev.codingLevel = obj['LLM Coding Level'] || '';
    ev.codeContextAttached = asBool(obj['Code Context Attached']);
    ev.consoleContextAttached = asBool(obj['Console Context Attached']);
    return ev;
  });

  return { meta, events, profile };
}

export default {
  id: profile.formatId,
  label: profile.label,
  schemaVersion: profile.schemaVersion,
  detect,
  parse,
  profile,
};
