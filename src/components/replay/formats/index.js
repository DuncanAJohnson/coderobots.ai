/**
 * Replay format-adapter registry.
 *
 * `selectFormat` picks the adapter for an already-split CSV: an explicit
 * "Schema Version" metadata line wins (the going-forward path); otherwise the
 * first adapter whose header signature matches. Add a future editor version by
 * writing one adapter module and registering it here.
 */

import currentFormat from './currentFormat';
import legacyFormat from './legacyFormat';

// Detection priority: most-specific/newest first, legacy last (loosest signature).
export const FORMATS = [currentFormat, legacyFormat];

/**
 * @param {{ columns: string[], metaByKey: Object }} split
 * @returns the matching adapter
 * @throws with a diagnosable message if nothing matches.
 */
export function selectFormat({ columns, metaByKey }) {
  const versionRaw = metaByKey['Schema Version'];
  if (versionRaw !== undefined && versionRaw !== null && String(versionRaw).trim() !== '') {
    const version = Number(versionRaw);
    if (!Number.isNaN(version)) {
      const match = FORMATS.find((f) => f.schemaVersion === version);
      if (match) return match;
      throw new Error(
        `This session CSV declares Schema Version ${version}, which this viewer does not support.`
      );
    }
  }

  const match = FORMATS.find((f) => f.detect({ columns, metaByKey }));
  if (match) return match;

  throw new Error(
    `Unrecognized session CSV format — no adapter matched (columns: ${(columns || [])
      .slice(0, 8)
      .join(', ')}). If this is a new editor version, add an adapter under replay/formats/.`
  );
}
