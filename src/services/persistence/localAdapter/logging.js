/**
 * Data logger adapter (browser-local).
 * Mirrors supabaseAdapter/logging.js contracts.
 */

import { insertRow, updateRow, findRow, selectRows, nowIso } from './store';

export const logMessage = async (messageData) => {
  if (!messageData?.conversation_id) {
    console.error('Cannot log message without conversation ID');
    return null;
  }
  return insertRow('messages', { ...messageData, timestamp: nowIso() });
};

export const logInteraction = async (buttonName, sessionId) => {
  if (!sessionId) {
    console.error('Cannot log interaction without session ID');
    return null;
  }
  return insertRow('interactions', {
    session_id: sessionId,
    button_name: buttonName,
    timestamp: nowIso(),
  });
};

export const logConsole = async (consoleContent, sessionId, saveSource) => {
  if (!sessionId) {
    console.error('Cannot log console without session ID');
    return null;
  }

  const record = insertRow('console', {
    session_id: sessionId,
    content: consoleContent,
    save_source: saveSource,
    timestamp: nowIso(),
  });

  // Update session pointer if not a context log
  if (saveSource !== 'chat_context') {
    updateRow('sessions', sessionId, {
      current_console_id: record.id,
      last_updated: nowIso(),
    });
  }

  return record.id;
};

export const getConversationHistory = async (conversationId) =>
  selectRows('messages', (r) => r.conversation_id === conversationId, 'timestamp', true);

export const getLatestCode = async (sessionId) => {
  const session = findRow('sessions', sessionId);
  if (!session?.current_code_id) {
    console.log(`No code associated with session ${sessionId}`);
    return null;
  }
  const code = findRow('code', session.current_code_id);
  return code ? code.content : null;
};

export const getLatestConsole = async (sessionId) => {
  const session = findRow('sessions', sessionId);
  if (!session?.current_console_id) {
    console.log(`No console associated with session ${sessionId}`);
    return null;
  }
  const consoleRecord = findRow('console', session.current_console_id);
  return consoleRecord ? consoleRecord.content : null;
};

export const updateSessionOnLoad = async (sessionId) => {
  const session = findRow('sessions', sessionId);
  if (!session) {
    console.error('Could not find session to update timestamps');
    return;
  }
  const timestamps = session.loaded_timestamps || [];
  const now = nowIso();
  timestamps.push(now);
  updateRow('sessions', sessionId, {
    loaded_timestamps: timestamps,
    last_updated: now,
  });
};
