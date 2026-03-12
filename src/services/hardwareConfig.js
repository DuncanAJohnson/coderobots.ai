/**
 * LilyBot hardware configuration service.
 * Reads available parts from app_config and user wiring from auth metadata.
 */

import { supabase } from './supabase';
import { parseFritzingModule, makeConnectorLabel } from '../utils/fritzing';
import picoWFzpRaw from '../assets/fritzing/PicoW/PicoW.fzp?raw';
import picoWSvgRaw from '../assets/fritzing/PicoW/PicoW.svg?raw';
import adafruitTB6612FzpRaw from '../assets/fritzing/AdafruitTB6612MotorDriver/AdafruitTB6612.fzp?raw';
import adafruitTB6612SvgRaw from '../assets/fritzing/AdafruitTB6612MotorDriver/AdafruitTB6612.svg?raw';

const APP_CONFIG_MPU_KEY = 'LILYBOT_MPUS';
const APP_CONFIG_COMPONENTS_KEY = 'LILYBOT_COMPONENTS';
const APP_CONFIG_TEMPLATES_KEY = 'LILYBOT_HARDWARE_TEMPLATES';
const USER_CONFIG_KEY = 'lilybot_hardware_config';

let cachedCatalogPromise = null;

const LOCAL_PICO_W_IDS = new Set(['rpi-picow', 'rpi-pico-w', 'picow', 'pico-w']);

function isPicoWPart(part) {
  const normalizedId = String(part?.id || '').toLowerCase();
  const normalizedName = String(part?.name || '').toLowerCase();
  return LOCAL_PICO_W_IDS.has(normalizedId) || normalizedName.includes('pico w');
}

const LOCAL_ADAFRUIT_TB6612_IDS = new Set(['adafruit-tb6612', 'adafruit-tb6612fng', 'adafruit-tb6612-motor-driver']);

function isAdafruitTB6612Part(part) {
  const normalizedId = String(part?.id || '').toLowerCase();
  const normalizedName = String(part?.name || '').toLowerCase();
  return LOCAL_ADAFRUIT_TB6612_IDS.has(normalizedId) || (normalizedName.includes('adafruit') && normalizedName.includes('tb6612'));
}

function applyLocalPartOverrides(parts, key) {
  if (!Array.isArray(parts)) return parts;

  return parts.map((part) => {
    if (key === APP_CONFIG_MPU_KEY && isPicoWPart(part)) {
      return {
        ...part,
        fzp_url: '',
        fzp_raw: picoWFzpRaw,
        svg_url: '',
        svg_raw: picoWSvgRaw,
      };
    }
    if (key === APP_CONFIG_COMPONENTS_KEY && isAdafruitTB6612Part(part)) {
      return {
        ...part,
        fzp_url: '',
        fzp_raw: adafruitTB6612FzpRaw,
        svg_url: '',
        svg_raw: adafruitTB6612SvgRaw,
      };
    }
    return part;
  });
}

function normalizePartRow(part) {
  if (!part || typeof part !== 'object') return null;

  const id = String(part.id || '').trim();
  const name = String(part.name || '').trim();
  if (!id || !name) return null;

  return {
    id,
    name,
    kind: part.kind || 'component',
    fzp_url: part.fzp_url || '',
    svg_url: part.svg_url || '',
    svg_raw: part.svg_raw || '',
    pins: Array.isArray(part.pins) ? part.pins : [],
  };
}

async function fetchPartsFromConfig(key) {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch ${key} from app_config: ${error.message}`);
  if (!data?.value) throw new Error(`No data found for ${key} in app_config`);

  const rows = Array.isArray(data.value) ? data.value : [];
  const normalized = rows.map(normalizePartRow).filter(Boolean);
  if (normalized.length === 0) throw new Error(`${key} in app_config is empty or invalid`);
  return applyLocalPartOverrides(normalized, key);
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

async function resolvePartPins(part) {
  if (Array.isArray(part.pins) && part.pins.length > 0) {
    return part;
  }
  if (!part.fzp_url && !part.fzp_raw) {
    return { ...part, pins: [] };
  }

  try {
    let xmlText = '';

    if (part.fzp_raw) {
      xmlText = part.fzp_raw;
    } else {
      const response = await fetch(part.fzp_url);
      if (!response.ok) {
        throw new Error(`Unable to fetch ${part.fzp_url}`);
      }
      xmlText = await response.text();
    }

    const parsed = parseFritzingModule(xmlText);
    const pins = (parsed?.connectors || []).map((connector) => ({
      id: connector.id,
      name: connector.name || connector.id,
      description: connector.description || '',
      svgId: connector.svgId || '',
    }));
    return { ...part, pins };
  } catch (error) {
    console.error('Error resolving Fritzing pins:', error);
    return { ...part, pins: [] };
  }
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
    fetchPartsFromConfig(APP_CONFIG_MPU_KEY),
    fetchPartsFromConfig(APP_CONFIG_COMPONENTS_KEY),
    fetchTemplatesFromConfig(),
  ]);

  const [resolvedMpus, resolvedComponents] = await Promise.all([
    Promise.all(mpus.map(resolvePartPins)),
    Promise.all(components.map(resolvePartPins)),
  ]);

    return {
      mpus: resolvedMpus,
      components: resolvedComponents,
      templates,
    };
  })();

  return cachedCatalogPromise;
}

export async function getCurrentUserHardwareConfig() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  return data?.user?.user_metadata?.[USER_CONFIG_KEY] || null;
}

export async function saveCurrentUserHardwareConfig(config) {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  const existingMetadata = data?.user?.user_metadata || {};
  const mergedData = {
    ...existingMetadata,
    [USER_CONFIG_KEY]: {
      ...config,
      updatedAt: new Date().toISOString(),
    },
  };

  const { error: updateError } = await supabase.auth.updateUser({
    data: mergedData,
  });

  if (updateError) throw updateError;
}

export function getDefaultHardwareConfig(catalog) {
  const firstMpu = catalog?.mpus?.[0];
  return {
    selectedMpuId: firstMpu?.id || '',
    components: [],
    mappings: {},
  };
}

export function buildConnectionLabel(componentInstance, connector) {
  const componentName = componentInstance?.nickname || componentInstance?.name || 'Component';
  return makeConnectorLabel(componentName, connector);
}

export function toPromptHardwareConfig(config, catalog) {
  if (!config || !catalog) return null;

  const mpu = (catalog.mpus || []).find((item) => item.id === config.selectedMpuId);
  if (!mpu) return null;

  const componentInstances = (config.components || []).map((instance) => {
    const def = (catalog.components || []).find((item) => item.id === instance.componentId);
    return {
      ...instance,
      name: def?.name || instance.componentId,
    };
  });

  const instanceById = componentInstances.reduce((acc, instance) => {
    acc[instance.instanceId] = instance;
    return acc;
  }, {});

  const mpuPinMap = (mpu.pins || []).reduce((acc, pin) => {
    acc[pin.id] = pin.name || pin.id;
    return acc;
  }, {});

  const mappingLines = Object.entries(config.mappings || {}).map(([mpuPinId, mapping]) => {
    const mpuPinName = mpuPinMap[mpuPinId] || mpuPinId;
    const instance = instanceById[mapping.instanceId];
    const componentLabel = mapping.label || `${instance?.nickname || instance?.name || 'Component'} ${mapping.componentPinId}`;
    return `${mpuPinName} -> ${componentLabel}`;
  });

  return {
    selectedMpuName: mpu.name,
    components: componentInstances,
    mappingLines,
  };
}
