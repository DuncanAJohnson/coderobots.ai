/**
 * LilyBot hardware configuration adapter (Supabase).
 * Reads available parts from app_config and user wiring from auth metadata.
 *
 * Supabase app_config holds simple id arrays:
 *   LILYBOT_MPUS:       ["rpi-picow"]
 *   LILYBOT_COMPONENTS: ["adafruit-tb6612", "hc-sr04"]
 */

import { supabase } from '../../supabase';
import {
  APP_CONFIG_MPU_KEY,
  APP_CONFIG_COMPONENTS_KEY,
  APP_CONFIG_TEMPLATES_KEY,
  USER_CONFIG_KEY,
  resolvePartFromCatalog,
  resolvePartPins,
  normalizeHardwareConfig,
  getDefaultHardwareConfig,
} from '../../hardwareParts';

let cachedCatalogPromise = null;

async function fetchPartIdsFromConfig(key) {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch ${key} from app_config: ${error.message}`);
  if (!data?.value) throw new Error(`No data found for ${key} in app_config`);

  const ids = Array.isArray(data.value) ? data.value : [];
  const parts = ids.map(resolvePartFromCatalog).filter(Boolean);
  if (parts.length === 0) throw new Error(`${key} in app_config is empty or has no matching catalog entries`);
  return parts;
}

async function fetchTemplatesFromConfig() {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', APP_CONFIG_TEMPLATES_KEY)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch templates from app_config: ${error.message}`);
  if (!data?.value) throw new Error(`No data found for ${APP_CONFIG_TEMPLATES_KEY} in app_config`);

  // Support both a single template object and an array of templates
  const raw = Array.isArray(data.value) ? data.value : [data.value];
  if (raw.length === 0) throw new Error(`${APP_CONFIG_TEMPLATES_KEY} in app_config is empty`);
  return raw;
}

export async function getHardwareCatalog(forceRefresh = false) {
  if (forceRefresh) {
    cachedCatalogPromise = null;
  }

  if (cachedCatalogPromise) {
    return cachedCatalogPromise;
  }

  cachedCatalogPromise = (async () => {
    const [mpus, components, templates] = await Promise.all([
      fetchPartIdsFromConfig(APP_CONFIG_MPU_KEY),
      fetchPartIdsFromConfig(APP_CONFIG_COMPONENTS_KEY),
      fetchTemplatesFromConfig(),
    ]);

    const [resolvedMpus, resolvedComponents] = await Promise.all([
      Promise.all(mpus.map(resolvePartPins)),
      Promise.all(components.map(resolvePartPins)),
    ]);

    return {
      mpus: resolvedMpus,
      components: resolvedComponents,
      templates: templates.map((template) => normalizeHardwareConfig(template)),
    };
  })();

  return cachedCatalogPromise;
}

export async function getCurrentUserHardwareConfig() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  return normalizeHardwareConfig(data?.user?.user_metadata?.[USER_CONFIG_KEY]);
}

export async function saveCurrentUserHardwareConfig(config) {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  const normalizedConfig = normalizeHardwareConfig(config) || getDefaultHardwareConfig();
  const existingMetadata = data?.user?.user_metadata || {};
  const mergedData = {
    ...existingMetadata,
    [USER_CONFIG_KEY]: {
      ...normalizedConfig,
      updatedAt: new Date().toISOString(),
    },
  };

  const { error: updateError } = await supabase.auth.updateUser({
    data: mergedData,
  });

  if (updateError) throw updateError;
}
