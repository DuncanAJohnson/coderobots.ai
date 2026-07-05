/**
 * Local (browser-only) persistence adapter for no-telemetry instances.
 * Same interface as supabaseAdapter (see ../index.js); rows live in a
 * localStorage-backed store (./store.js) instead of Supabase.
 */

import * as sessions from './sessions';
import * as logging from './logging';
import * as usage from './usage';
import * as profile from './profile';
import * as hardware from './hardware';

export default { sessions, logging, usage, profile, hardware };
