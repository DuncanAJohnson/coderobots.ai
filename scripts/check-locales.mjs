/**
 * Locale dictionary checks for the hand-rolled i18n system.
 *
 *   node scripts/check-locales.mjs
 *
 * Fails (exit 1) when:
 *  - a key exists in one locale but not another (parity)
 *  - a t('key') referenced in src/ is missing from en.json
 * Warns (exit 0) when a dictionary key is never referenced — dynamic keys
 * (t(someVar)) can't be traced statically, so unused keys are not fatal.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const localesDir = join(root, 'src', 'locales');
const srcDir = join(root, 'src');

const locales = {};
for (const file of readdirSync(localesDir)) {
  if (!file.endsWith('.json')) continue;
  locales[file.replace('.json', '')] = JSON.parse(
    readFileSync(join(localesDir, file), 'utf8')
  );
}

const localeNames = Object.keys(locales);
if (localeNames.length === 0) {
  console.error('No locale files found');
  process.exit(1);
}

let failed = false;

// 1. Key parity across locales
const allKeys = new Set(localeNames.flatMap((l) => Object.keys(locales[l])));
for (const locale of localeNames) {
  const missing = [...allKeys].filter((k) => !(k in locales[locale]));
  if (missing.length > 0) {
    failed = true;
    console.error(`✗ ${locale}.json is missing ${missing.length} key(s):`);
    for (const k of missing) console.error(`    ${k}`);
  }
}

// 2. Every statically referenced t('key') must exist in en.json
function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'locales' || entry === 'assets') continue;
      yield* walk(full);
    } else if (/\.(jsx?|tsx?)$/.test(entry)) {
      yield full;
    }
  }
}

const used = new Set();
// Matches t('key') and the tRef-based tr('key') used inside stable callbacks.
const T_CALL = /\btr?\(\s*['"]([^'"]+)['"]\s*\)/g;
for (const file of walk(srcDir)) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(T_CALL)) {
    used.add(match[1]);
  }
}

const en = locales.en || {};
const undefinedKeys = [...used].filter((k) => !(k in en));
if (undefinedKeys.length > 0) {
  failed = true;
  console.error(`✗ ${undefinedKeys.length} t('key') reference(s) missing from en.json:`);
  for (const k of undefinedKeys) console.error(`    ${k}`);
}

// 3. Unused dictionary keys (warning only)
const unused = [...Object.keys(en)].filter((k) => !used.has(k));
if (unused.length > 0) {
  console.warn(`⚠ ${unused.length} en.json key(s) never referenced statically (may be dynamic or pending):`);
  for (const k of unused) console.warn(`    ${k}`);
}

if (failed) {
  process.exit(1);
}
console.log(
  `✓ locales OK — ${localeNames.join(', ')}; ${allKeys.size} keys, ${used.size} referenced`
);
