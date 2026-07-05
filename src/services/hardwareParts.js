/**
 * LilyBot hardware parts helpers — the pure half of the hardware config
 * service. Owns the Fritzing asset registry, catalog resolution, and
 * mapping/prompt normalization. No Supabase access here; fetching the
 * catalog and per-user config lives in the persistence adapter.
 *
 * Part metadata (name, folder) lives in src/assets/fritzing/catalog.js.
 * Fritzing files live in src/assets/fritzing/<folder>/.
 */

import { parseFritzingModule, makeConnectorLabel } from '../utils/fritzing';
import fritzingCatalog from '../assets/fritzing/catalog';

export const APP_CONFIG_MPU_KEY = 'LILYBOT_MPUS';
export const APP_CONFIG_COMPONENTS_KEY = 'LILYBOT_COMPONENTS';
export const APP_CONFIG_TEMPLATES_KEY = 'LILYBOT_HARDWARE_TEMPLATES';
export const USER_CONFIG_KEY = 'lilybot_hardware_config';

function normalizeMappingEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (!entry.instanceId || !entry.componentPinId) return null;
  return {
    instanceId: entry.instanceId,
    componentPinId: entry.componentPinId,
    label: entry.label || '',
  };
}

export function getMappingEntries(mappingValue) {
  if (Array.isArray(mappingValue)) {
    return mappingValue
      .map(normalizeMappingEntry)
      .filter(Boolean);
  }
  const singleEntry = normalizeMappingEntry(mappingValue);
  return singleEntry ? [singleEntry] : [];
}

export function normalizeMappingsByMpuPin(mappings) {
  const normalized = {};
  Object.entries(mappings || {}).forEach(([mpuPinId, mappingValue]) => {
    const entries = getMappingEntries(mappingValue);
    if (entries.length > 0) {
      normalized[mpuPinId] = entries;
    }
  });
  return normalized;
}

export function flattenMappings(mappings) {
  return Object.entries(mappings || {}).flatMap(([mpuPinId, mappingValue]) =>
    getMappingEntries(mappingValue).map((entry) => ({ mpuPinId, ...entry })),
  );
}

export function normalizeHardwareConfig(config) {
  if (!config || typeof config !== 'object') return null;
  return {
    ...config,
    mappings: normalizeMappingsByMpuPin(config.mappings),
  };
}

// Eagerly load all .fzp, .svg, and prompt.md files under src/assets/fritzing/<folder>/
const fzpAssets = import.meta.glob('../assets/fritzing/*/*.fzp', { as: 'raw', eager: true });
const svgAssets = import.meta.glob('../assets/fritzing/*/*.svg', { as: 'raw', eager: true });
const promptAssets = import.meta.glob('../assets/fritzing/*/prompt.md', { as: 'raw', eager: true });

function buildFritzingRegistry() {
  const registry = {};
  for (const [path, content] of Object.entries(fzpAssets)) {
    const folder = path.split('/').at(-2);
    registry[folder] = { ...(registry[folder] || {}), fzp_raw: content };
  }
  for (const [path, content] of Object.entries(svgAssets)) {
    const folder = path.split('/').at(-2);
    registry[folder] = { ...(registry[folder] || {}), svg_raw: content };
  }
  for (const [path, content] of Object.entries(promptAssets)) {
    const folder = path.split('/').at(-2);
    registry[folder] = { ...(registry[folder] || {}), prompt_md: content };
  }
  return registry;
}

const fritzingRegistry = buildFritzingRegistry();

// Index catalog by id for fast lookup
const catalogById = Object.fromEntries(fritzingCatalog.map((entry) => [entry.id, entry]));

export function resolvePartFromCatalog(id) {
  const entry = catalogById[id];
  if (!entry) {
    console.warn(`Part id "${id}" not found in fritzing catalog — skipping.`);
    return null;
  }
  const files = entry.folder ? fritzingRegistry[entry.folder] : {};
  return {
    id: entry.id,
    name: entry.name,
    kind: entry.kind || 'component',
    fzp_raw: files?.fzp_raw || '',
    svg_raw: files?.svg_raw || '',
    prompt_md: files?.prompt_md || '',
    pins: [],
  };
}

export function resolvePartPins(part) {
  if (!part.fzp_raw) {
    return { ...part, pins: [] };
  }

  try {
    const parsed = parseFritzingModule(part.fzp_raw);
    const pins = (parsed?.connectors || []).map((connector) => {
      const description = connector.description || '';
      const descFirst = description.split('/')[0].trim();
      const gpioMatch = descFirst.match(/^[GC]P(\d+)$/i);
      const id = gpioMatch ? `gp${gpioMatch[1]}` : connector.id;
      return {
        id,
        name: connector.name || connector.id,
        description,
        svgId: connector.svgId || '',
      };
    });
    return { ...part, pins };
  } catch (error) {
    console.error('Error resolving Fritzing pins:', error);
    return { ...part, pins: [] };
  }
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

function getPromptPinName(pin) {
  if (!pin || typeof pin !== 'object') return '';
  const description = typeof pin.description === 'string' ? pin.description.trim() : '';
  if (description) {
    const firstSegment = description.split('/')[0].trim();
    const firstToken = firstSegment.split(/\s+/)[0];
    if (firstToken) return firstToken;
  }
  return pin.name || pin.id || '';
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
    acc[pin.id] = getPromptPinName(pin);
    return acc;
  }, {});

  const mappingLines = flattenMappings(config.mappings).map(({ mpuPinId, ...mapping }) => {
    const mpuPinName = mpuPinMap[mpuPinId] || mpuPinId;
    const instance = instanceById[mapping.instanceId];
    const componentLabel = mapping.label || `${instance?.nickname || instance?.name || 'Component'} ${mapping.componentPinId}`;
    return `${mpuPinName} -> ${componentLabel}`;
  });

  const seenComponentIds = new Set();
  const componentPrompts = [];
  componentInstances.forEach((instance) => {
    if (seenComponentIds.has(instance.componentId)) return;
    const def = (catalog.components || []).find((item) => item.id === instance.componentId);
    const prompt = def?.prompt_md || '';
    if (!prompt) return;
    seenComponentIds.add(instance.componentId);
    componentPrompts.push({
      componentId: instance.componentId,
      name: def?.name || instance.componentId,
      prompt,
    });
  });

  return {
    selectedMpuName: mpu.name,
    mpuPrompt: mpu.prompt_md || '',
    components: componentInstances,
    componentPrompts,
    mappingLines,
  };
}
