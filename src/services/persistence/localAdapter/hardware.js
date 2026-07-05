/**
 * Hardware configuration adapter (browser-local).
 * The LilyBot wiring catalog lives in Supabase app_config, so no-telemetry
 * instances (which don't enable lilybot) have no catalog. A null catalog
 * makes toPromptHardwareConfig(...) return null, which platforms handle.
 */

export async function getHardwareCatalog() {
  return null;
}

export async function getCurrentUserHardwareConfig() {
  return null;
}

export async function saveCurrentUserHardwareConfig() {
  console.warn('Hardware config is not persisted on no-telemetry instances');
}
