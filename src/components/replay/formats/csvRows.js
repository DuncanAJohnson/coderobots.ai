/**
 * Format-independent CSV mechanics shared by every replay format adapter.
 *
 * A merged session CSV is a small key/value metadata block, a blank line, then a
 * header row that starts with "Event ID" followed by the time-sorted event rows.
 * These helpers split that structure and zip rows into objects; each adapter then
 * maps the raw columns of its own generation into the canonical event shape.
 */

import Papa from 'papaparse';

/** True for null/empty/whitespace and the literal string 'None'. */
export function isBlank(value) {
  if (value === null || value === undefined) return true;
  const text = String(value).trim();
  return text === '' || text.toLowerCase() === 'none';
}

/** Parse a boolean-ish CSV cell ('True'/'true'/'1'/'yes') into a real boolean. */
export function asBool(value) {
  if (value === true) return true;
  const text = String(value ?? '').trim().toLowerCase();
  return text === 'true' || text === '1' || text === 'yes';
}

/**
 * Split the raw CSV text into its structural pieces, without interpreting any
 * event columns (that is each adapter's job).
 *
 * @returns {{ rows: string[][], headerIdx: number, metaByKey: Object,
 *             columns: string[], eventRows: string[][] }}
 * @throws if no "Event ID" header row is present.
 */
export function splitCsvRows(text) {
  const { data: rows } = Papa.parse(text, { skipEmptyLines: false });

  const headerIdx = rows.findIndex((r) => (r[0] || '').trim() === 'Event ID');
  if (headerIdx === -1) {
    throw new Error(
      'This file does not look like a merged session CSV (no "Event ID" header row was found).'
    );
  }

  // Metadata block: the key/value rows above the header.
  const metaByKey = {};
  for (const row of rows.slice(0, headerIdx)) {
    if (row.length >= 2 && (row[0] || '').trim()) {
      metaByKey[row[0].trim()] = row[1];
    }
  }

  const columns = rows[headerIdx];
  const eventRows = rows
    .slice(headerIdx + 1)
    .filter((r) => r.some((cell) => cell !== '' && cell !== null && cell !== undefined));

  return { rows, headerIdx, metaByKey, columns, eventRows };
}

/** Zip a raw event row against the header columns into a name-keyed object. */
export function zipRow(columns, row) {
  const obj = {};
  columns.forEach((col, i) => {
    obj[col] = row[i] ?? '';
  });
  return obj;
}
