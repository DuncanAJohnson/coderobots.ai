/**
 * The canonical shapes that decouple the replay frame-builder and render panes
 * from any specific CSV layout.
 *
 * Every format adapter (see ./currentFormat.js, ./legacyFormat.js) maps its own
 * generation's raw columns into a `CanonicalEvent` and declares a `ReplayProfile`
 * describing which editor capabilities that generation had. `buildFrames` reads
 * only canonical camelCase keys; the render panes read only the profile. Adding a
 * future editor version therefore means adding one adapter — nothing downstream
 * needs to change.
 */

/**
 * @typedef {Object} CanonicalEvent
 * @property {'code'|'console'|'interaction'|'message'|string} type
 * @property {string} timestamp             ISO-8601, as recorded.
 * @property {string} codeTabName           '' when the format has no code tabs.
 * @property {string} code
 * @property {string} codeSaveSource
 * @property {string} console
 * @property {string} consoleSaveSource
 * @property {string} buttonName            interaction button key.
 * @property {string} chatTabName           '' when the format has no chat tabs.
 * @property {string} messageAuthor         raw author: 'user' | 'assistant' | 'system' | ...
 * @property {string} message
 * @property {string} aiModel
 * @property {string} codingLevel
 * @property {string|number} promptTokens
 * @property {string|number} completionTokens
 * @property {boolean} codeContextAttached
 * @property {boolean} consoleContextAttached
 */

/**
 * @typedef {Object} ReplayProfile
 * @property {number} schemaVersion         0 = legacy, 1 = current, N = future.
 * @property {string} formatId              stable id, e.g. 'legacy-v0'.
 * @property {string} label                 human label for the UI.
 * @property {boolean} hasCodeTabs          render the CodeTabs chrome?
 * @property {boolean} hasChatTabs          render the ChatTabs chrome?
 * @property {boolean} hasSystemMessages    expect 'system'-role chat events?
 * @property {boolean} hasTokenStats        format carries prompt/completion tokens?
 * @property {boolean} hasContextContent    true = dereferenced content, false = boolean flags only.
 */

/** A canonical event with safe defaults; adapters set only the fields they carry. */
export function emptyCanonicalEvent() {
  return {
    type: '',
    timestamp: '',
    codeTabName: '',
    code: '',
    codeSaveSource: '',
    console: '',
    consoleSaveSource: '',
    buttonName: '',
    chatTabName: '',
    messageAuthor: '',
    message: '',
    aiModel: '',
    codingLevel: '',
    promptTokens: '',
    completionTokens: '',
    codeContextAttached: false,
    consoleContextAttached: false,
  };
}
