/**
 * Data Logger Service
 * Logging and retrieval of messages, interactions, and console output.
 *
 * Facade over the persistence adapter (src/services/persistence/): the
 * Supabase implementation lives in persistence/supabaseAdapter/logging.js,
 * the browser-local one in persistence/localAdapter/.
 */

import { adapter } from './persistence';

export const logMessage = (...args) => adapter.logging.logMessage(...args);
export const logInteraction = (...args) => adapter.logging.logInteraction(...args);
export const logConsole = (...args) => adapter.logging.logConsole(...args);
export const getConversationHistory = (...args) => adapter.logging.getConversationHistory(...args);
export const getLatestCode = (...args) => adapter.logging.getLatestCode(...args);
export const getLatestConsole = (...args) => adapter.logging.getLatestConsole(...args);
export const updateSessionOnLoad = (...args) => adapter.logging.updateSessionOnLoad(...args);
