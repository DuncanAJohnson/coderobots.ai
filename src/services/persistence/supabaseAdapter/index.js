/**
 * Supabase persistence adapter — the original cloud-backed implementation.
 * Function signatures and returned row shapes define the adapter interface
 * (see ../index.js).
 */

import * as sessions from './sessions';
import * as logging from './logging';
import * as usage from './usage';
import * as profile from './profile';
import * as hardware from './hardware';

export default { sessions, logging, usage, profile, hardware };
