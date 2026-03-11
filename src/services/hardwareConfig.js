/**
 * LilyBot hardware configuration service.
 * Reads available parts from app_config and user wiring from auth metadata.
 */

import { supabase } from './supabase';
import { parseFritzingModule, makeConnectorLabel } from '../utils/fritzing';
import picoWFzpRaw from '../assets/fritzing/PicoW/PicoW.fzp?raw';
import picoWSvgRaw from '../assets/fritzing/PicoW/PicoW.svg?raw';

const APP_CONFIG_MPU_KEY = 'LILYBOT_MPUS';
const APP_CONFIG_COMPONENTS_KEY = 'LILYBOT_COMPONENTS';
const APP_CONFIG_TEMPLATES_KEY = 'LILYBOT_HARDWARE_TEMPLATES';
const USER_CONFIG_KEY = 'lilybot_hardware_config';

const FALLBACK_MPUS = [
  {
    id: 'rpi-pico',
    name: 'Raspberry Pi Pico',
    kind: 'mpu',
    fzp_url: '',
    svg_url: '',
    pins: [
      { id: 'gp16', name: 'GP16' },
      { id: 'gp17', name: 'GP17' },
      { id: 'gp20', name: 'GP20' },
      { id: 'gp21', name: 'GP21' },
      { id: 'gp22', name: 'GP22' },
      { id: 'gp26', name: 'GP26' },
      { id: 'gp27', name: 'GP27' },
      { id: 'gp28', name: 'GP28' },
    ],
  },
  {
    id: 'arduino-uno',
    name: 'Arduino Uno',
    kind: 'mpu',
    fzp_url: '',
    svg_url: '',
    pins: [
      { id: 'd2', name: 'D2' },
      { id: 'd3', name: 'D3' },
      { id: 'd4', name: 'D4' },
      { id: 'd5', name: 'D5' },
      { id: 'd6', name: 'D6' },
      { id: 'd7', name: 'D7' },
      { id: 'd8', name: 'D8' },
      { id: 'd9', name: 'D9' },
      { id: 'd10', name: 'D10' },
      { id: 'd11', name: 'D11' },
      { id: 'd12', name: 'D12' },
      { id: 'd13', name: 'D13' },
      { id: 'a0', name: 'A0' },
      { id: 'a1', name: 'A1' },
      { id: 'a2', name: 'A2' },
    ],
  },
];

const FALLBACK_COMPONENTS = [
  {
    id: 'tb6612fng',
    name: 'Motor Driver TB6612FNG',
    kind: 'component',
    fzp_url: '',
    svg_url: '',
    pins: [
      { id: 'pwma', name: 'PWMA' },
      { id: 'ain1', name: 'AIN1' },
      { id: 'ain2', name: 'AIN2' },
      { id: 'bin1', name: 'BIN1' },
      { id: 'bin2', name: 'BIN2' },
      { id: 'pwmb', name: 'PWMB' },
    ],
  },
  {
    id: 'led-5mm',
    name: 'LED 5mm',
    kind: 'component',
    fzp_url: '',
    svg_url: '',
    pins: [
      { id: 'anode', name: 'anode' },
      { id: 'cathode', name: 'cathode' },
    ],
  },
  {
    id: 'hc-sr04',
    name: 'HC-SR04 Ultrasonic Sensor',
    kind: 'component',
    fzp_url: 'https://raw.githubusercontent.com/fritzing/fritzing-parts/12761296fc8bcc53ed481b78e3a99c907d85b18d/core/hc-sr04_bf8299a_002.fzp',
    svg_url: 'https://raw.githubusercontent.com/fritzing/fritzing-parts/12761296fc8bcc53ed481b78e3a99c907d85b18d/svg/core/icon/hc-sr04_bf8299a_002.svg',
    pins: [
      { id: 'vcc', name: 'VCC' },
      { id: 'trig', name: 'TRIG' },
      { id: 'echo', name: 'ECHO' },
      { id: 'gnd', name: 'GND' },
    ],
  },
];

const FALLBACK_TEMPLATES = [
  {
    id: 'default-pico-lilybot',
    name: 'Default LilyBot (Pico + TB6612 + HC-SR04)',
    selectedMpuId: 'rpi-pico',
    components: [
      { instanceId: 'tb6612-1', componentId: 'tb6612fng', nickname: 'Motor Driver' },
      { instanceId: 'hcsr04-1', componentId: 'hc-sr04', nickname: 'Ultrasonic' },
    ],
    mappings: {
      gp28: { instanceId: 'tb6612-1', componentPinId: 'pwma', label: 'Motor Driver PWMA' },
      gp27: { instanceId: 'tb6612-1', componentPinId: 'ain2', label: 'Motor Driver AIN2' },
      gp26: { instanceId: 'tb6612-1', componentPinId: 'ain1', label: 'Motor Driver AIN1' },
      gp22: { instanceId: 'tb6612-1', componentPinId: 'bin1', label: 'Motor Driver BIN1' },
      gp21: { instanceId: 'tb6612-1', componentPinId: 'bin2', label: 'Motor Driver BIN2' },
      gp20: { instanceId: 'tb6612-1', componentPinId: 'pwmb', label: 'Motor Driver PWMB' },
      gp17: { instanceId: 'hcsr04-1', componentPinId: 'trig', label: 'Ultrasonic TRIG' },
      gp16: { instanceId: 'hcsr04-1', componentPinId: 'echo', label: 'Ultrasonic ECHO' },
    },
  },
];

let cachedCatalogPromise = null;

const LOCAL_PICO_W_IDS = new Set(['rpi-picow', 'rpi-pico-w', 'picow', 'pico-w']);

function isPicoWPart(part) {
  const normalizedId = String(part?.id || '').toLowerCase();
  const normalizedName = String(part?.name || '').toLowerCase();
  return LOCAL_PICO_W_IDS.has(normalizedId) || normalizedName.includes('pico w');
}

function applyLocalPartOverrides(parts, key) {
  if (!Array.isArray(parts) || key !== APP_CONFIG_MPU_KEY) return parts;

  return parts.map((part) => {
    if (!isPicoWPart(part)) return part;
    return {
      ...part,
      fzp_url: '',
      fzp_raw: picoWFzpRaw,
      svg_url: '',
      svg_raw: picoWSvgRaw,
    };
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

async function fetchPartsFromConfig(key, fallbackValue) {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error || !data?.value) return applyLocalPartOverrides(fallbackValue, key);

  const rows = Array.isArray(data.value) ? data.value : [];
  const normalized = rows.map(normalizePartRow).filter(Boolean);
  const resolved = normalized.length > 0 ? normalized : fallbackValue;
  return applyLocalPartOverrides(resolved, key);
}

async function fetchTemplatesFromConfig() {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', APP_CONFIG_TEMPLATES_KEY)
    .maybeSingle();

  if (error || !data?.value) return FALLBACK_TEMPLATES;
  if (!Array.isArray(data.value)) return FALLBACK_TEMPLATES;
  return data.value;
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
    fetchPartsFromConfig(APP_CONFIG_MPU_KEY, FALLBACK_MPUS),
    fetchPartsFromConfig(APP_CONFIG_COMPONENTS_KEY, FALLBACK_COMPONENTS),
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
  const firstMpu = catalog?.mpus?.[0] || FALLBACK_MPUS[0];
  return {
    selectedMpuId: firstMpu.id,
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
