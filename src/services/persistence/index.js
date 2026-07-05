/**
 * Persistence adapter selection.
 *
 * The service facades in src/services/ (sessionManager, dataLogger, aiUsage,
 * userProfile, hardwareConfig) delegate all I/O here so instances can run
 * against either backend:
 *
 *   telemetry: true  → supabaseAdapter (cloud rows, requires auth + env vars)
 *   telemetry: false → localAdapter    (browser localStorage, anonymous)
 *
 * ## Adapter interface
 *
 * An adapter is `{ sessions, logging, usage, profile, hardware }` whose
 * functions mirror the original service signatures exactly, returning the
 * same row shapes callers already consume (see src/services/dbSchemas.js):
 *
 * - sessions: getUserSessions, createNewSession, updateSessionCode,
 *   updateSessionConsole, updateSessionName, getSessionConversations,
 *   createConversation, updateConversationName, updateSessionConversation,
 *   getSessionCode, createCode, updateCodeName, updateCodeContent,
 *   createCodeSnapshot, getCodeSnapshots, setSessionHardwarePlatform
 * - logging: logMessage, logInteraction, logConsole, getConversationHistory,
 *   getLatestCode, getLatestConsole, updateSessionOnLoad
 * - usage: getDailySpend, getDailyBudgetLimit, getDailyBudgetUsage,
 *   getUserAccessLevel
 * - profile: getUserProfile, saveUserProfile
 * - hardware: getHardwareCatalog, getCurrentUserHardwareConfig,
 *   saveCurrentUserHardwareConfig
 *
 * Rows must include the fields SessionContext consumes raw: `id`,
 * `created_at`/`start_time`, `hardware_platform`, `current_conversation_id`,
 * `current_code_id`, `current_console_id`, `name`, `content`, ...
 *
 * Note: adminUsage.js and dataExport.js intentionally bypass this seam and
 * import supabase directly — they back admin-only routes that are disabled
 * on no-telemetry instances.
 */

import instance from '../../config/instance';
import supabaseAdapter from './supabaseAdapter';
import localAdapter from './localAdapter';

export const adapter = instance.telemetry ? supabaseAdapter : localAdapter;
