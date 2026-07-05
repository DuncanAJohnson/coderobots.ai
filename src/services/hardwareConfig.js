/**
 * LilyBot hardware configuration service.
 *
 * Facade: pure catalog/mapping/prompt helpers live in hardwareParts.js;
 * fetching the catalog (app_config) and the per-user wiring (auth metadata)
 * goes through the persistence adapter (src/services/persistence/).
 */

import { adapter } from './persistence';

export {
  getMappingEntries,
  normalizeMappingsByMpuPin,
  flattenMappings,
  normalizeHardwareConfig,
  getDefaultHardwareConfig,
  buildConnectionLabel,
  toPromptHardwareConfig,
} from './hardwareParts';

export const getHardwareCatalog = (...args) => adapter.hardware.getHardwareCatalog(...args);
export const getCurrentUserHardwareConfig = (...args) => adapter.hardware.getCurrentUserHardwareConfig(...args);
export const saveCurrentUserHardwareConfig = (...args) => adapter.hardware.saveCurrentUserHardwareConfig(...args);
