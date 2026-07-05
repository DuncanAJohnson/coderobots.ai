/**
 * Supabase Client Configuration
 * Initializes and exports the Supabase client instance.
 *
 * No-telemetry instances run without Supabase env vars entirely, so this
 * module must stay import-safe when they are absent. In that case `supabase`
 * is a proxy that throws a descriptive error on first use — loud at the call
 * site instead of at import time.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const MISSING_ENV_MESSAGE =
  'Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing). ' +
  'Instances with telemetry: true require these in .env.local; ' +
  'no-telemetry instances must not reach this code path.';

function makeUnconfiguredClient() {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(MISSING_ENV_MESSAGE);
      },
    }
  );
}

// Create and export the Supabase client
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : makeUnconfiguredClient();

/**
 * Explicit guard for code that wants to fail before touching the client.
 */
export function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error(MISSING_ENV_MESSAGE);
  }
  return supabase;
}
