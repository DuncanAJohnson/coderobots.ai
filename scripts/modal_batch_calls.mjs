/**
 * Batch-call the Modal endpoint (VITE_MODAL_ENDPOINT_URL) with SPIKE priming.
 *
 * - Reads VITE_MODAL_ENDPOINT_URL from process.env or .env.local
 * - Calls the endpoint N times concurrently, kicked off with a fixed gap between START times
 * - Saves each response to a separate file in an output folder
 * - Logs per-call timing + total timing
 *
 * Usage:
 *   node scripts/modal_batch_calls.mjs
 *   node scripts/modal_batch_calls.mjs --count 15 --gapMs 5000 --outDir scripts_outputs/run-1
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { spikePriming } from '../src/prompts/spike_priming.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const DEFAULT_MESSAGES = [
  'forklare motormodulet',
  'forklare distance_sensor modulet',
  'Skriv et program til mig, der bevæger motorer på portene c og d',
  'Skriv et program til mig, der udskriver afstanden ved hjælp af en sensor på port c',
  'skriv en linje til mig efter robotten',
  'Skriv en musikspillende robot til mig',
  'Lav mig til en robot, der smiler',
  'Jeg får fejlen "ENODEV". Hvad kan problemet være?',
];

function parseArgs(argv) {
  const args = {
    count: 15,
    gapMs: 5000,
    outDir: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = argv[i + 1];

    if (a === '--count' && next) {
      args.count = Number(next);
      i += 1;
    } else if ((a === '--gapMs' || a === '--gap' || a === '--gap-ms') && next) {
      args.gapMs = Number(next);
      i += 1;
    } else if (a === '--outDir' && next) {
      args.outDir = next;
      i += 1;
    } else if (a === '--help' || a === '-h') {
      console.log(
        [
          'modal_batch_calls.mjs',
          '',
          'Options:',
          '  --count    15      Number of calls',
          '  --gapMs    5000    Delay between calls (ms)',
          '  --outDir   path    Output directory (default: scripts_outputs/<timestamp>)',
          '',
          'Notes:',
          '  Picks a random prompt each call from an internal list of 10 messages.',
          '',
        ].join('\n'),
      );
      process.exit(0);
    }
  }

  if (!Number.isFinite(args.count) || args.count <= 0) {
    throw new Error(`--count must be a positive number (got: ${String(args.count)})`);
  }
  if (!Number.isFinite(args.gapMs) || args.gapMs < 0) {
    throw new Error(`--gapMs must be a non-negative number (got: ${String(args.gapMs)})`);
  }

  return args;
}

function pickRandomMessage(messages = DEFAULT_MESSAGES) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('No messages available to pick from.');
  }
  return messages[randomInt(0, messages.length)];
}

function parseDotenv(dotenvText) {
  const out = {};
  const lines = dotenvText.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

async function getModalEndpointUrl() {
  if (process.env.VITE_MODAL_ENDPOINT_URL) return process.env.VITE_MODAL_ENDPOINT_URL;

  const envPath = path.join(projectRoot, '.env.local');
  try {
    const txt = await fs.readFile(envPath, 'utf8');
    const env = parseDotenv(txt);
    if (env.VITE_MODAL_ENDPOINT_URL) return env.VITE_MODAL_ENDPOINT_URL;
  } catch (err) {
    // ignore; handled below
  }

  throw new Error(
    'VITE_MODAL_ENDPOINT_URL is not set. Put it in .env.local or export it in your shell.',
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Consume a Modal SSE response and return the assembled "content".
 * Falls back to returning raw text if the response isn't SSE.
 */
async function readModalResponse(response, startHr) {
  if (!response.body || typeof response.body.getReader !== 'function') {
    const text = await response.text();
    return { text, ttftMs: null, isSse: false };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sawSse = false;
  let content = '';
  let rawText = '';
  let ttftMs = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        sawSse = true;
        const dataStr = line.slice(6);
        try {
          const data = JSON.parse(dataStr);
          if (data.type === 'content') {
            if (ttftMs == null && startHr != null) {
              const nowHr = process.hrtime.bigint();
              ttftMs = Number(nowHr - startHr) / 1e6;
            }
            content += data && data.content != null ? data.content : '';
          } else if (data.type === 'done') {
            return { text: content, ttftMs, isSse: true };
          } else if (data.type === 'error') {
            throw new Error(data.error || 'Unknown SSE error');
          }
        } catch (e) {
          // If parsing fails, keep going; some servers send non-JSON pings.
        }
      } else {
        // Non-SSE content; keep for fallback.
        rawText += `${line}\n`;
      }
    }
  }

  return sawSse
    ? { text: content, ttftMs, isSse: true }
    : { text: rawText.trimEnd(), ttftMs: null, isSse: false };
}

async function callModal(endpointUrl, messages, startHr) {
  if (typeof fetch !== 'function') {
    throw new Error(
      'Global fetch() is not available in this Node version. Use Node 18+ or add a fetch polyfill.',
    );
  }

  const res = await fetch(endpointUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? `\n\n${text}` : ''}`);
  }

  return await readModalResponse(res, startHr);
}

function buildMessages(userMessage) {
  // Mirrors the structure used in ChatPanel.jsx:
  // - system spike priming
  // - user message wrapped as "User question: ..."
  const fullPrompt = `User question: ${userMessage}`;
  return [
    { role: 'system', content: spikePriming },
    { role: 'user', content: fullPrompt },
  ];
}

function safeTimestampForPath(d = new Date()) {
  return d.toISOString().replace(/[:.]/g, '-');
}

async function runSingleCall({ index, endpointUrl, outDir, chosenMessage }) {
  const startedAt = new Date();
  const startHr = process.hrtime.bigint();

  let ok = true;
  let responseText = '';
  let errorText = '';
  let ttftMs = null;
  let isSse = null;

  try {
    const messages = buildMessages(chosenMessage);
    const out = await callModal(endpointUrl, messages, startHr);
    responseText = out.text;
    ttftMs = out.ttftMs;
    isSse = out.isSse;
  } catch (err) {
    ok = false;
    errorText = err instanceof Error ? err.stack || err.message : String(err);
    responseText = `ERROR:\n${errorText}\n`;
  }

  const endHr = process.hrtime.bigint();
  const endedAt = new Date();
  const durationMs = Number(endHr - startHr) / 1e6;

  const idx = String(index).padStart(2, '0');
  const outFile = path.join(outDir, `call_${idx}.txt`);
  const metaFile = path.join(outDir, `call_${idx}.json`);

  await fs.writeFile(outFile, responseText, 'utf8');
  await fs.writeFile(
    metaFile,
    JSON.stringify(
      {
        index,
        ok,
        message: chosenMessage,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationMs,
        ttftMs,
        isSse,
        outputFile: path.basename(outFile),
        error: ok ? null : errorText,
      },
      null,
      2,
    ),
    'utf8',
  );

  const ttftLabel = ttftMs == null ? 'ttft=NA' : `ttft=${Math.round(ttftMs)}ms`;
  console.log(`[${index}] ${ok ? 'OK' : 'FAIL'} ${durationMs.toFixed(0)}ms (${ttftLabel}) -> ${outFile}`);

  return {
    index,
    ok,
    message: chosenMessage,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMs,
    ttftMs,
    isSse,
    outputFile: path.basename(outFile),
    metaFile: path.basename(metaFile),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const endpointUrl = await getModalEndpointUrl();

  const runId = safeTimestampForPath();
  const outDir = path.resolve(projectRoot, args.outDir || path.join('scripts_outputs', runId));
  await fs.mkdir(outDir, { recursive: true });

  const summary = {
    endpointUrl,
    runId,
    outDir,
    count: args.count,
    gapMs: args.gapMs,
    messagesPool: DEFAULT_MESSAGES,
    calls: [],
  };

  const totalStart = process.hrtime.bigint();

  const tasks = [];
  for (let i = 1; i <= args.count; i += 1) {
    const chosenMessage = pickRandomMessage();
    const startDelayMs = (i - 1) * args.gapMs;

    // Kick off calls spaced by start time, allowing concurrency.
    tasks.push(
      (async () => {
        if (startDelayMs > 0) await sleep(startDelayMs);
        return await runSingleCall({ index: i, endpointUrl, outDir, chosenMessage });
      })(),
    );
  }

  const results = await Promise.all(tasks);
  results.sort((a, b) => a.index - b.index);
  summary.calls.push(...results);

  const totalEnd = process.hrtime.bigint();
  const totalMs = Number(totalEnd - totalStart) / 1e6;
  summary.totalMs = totalMs;

  summary.averageTtftMs = summary.calls.reduce((acc, call) => acc + (call.ttftMs || 0), 0) / summary.calls.length;

  await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log(`Total time: ${totalMs.toFixed(0)}ms (${(totalMs / 1000).toFixed(2)}s)`);
  console.log(
    `Average time to first token: ${
      summary.calls.reduce((acc, call) => acc + (call.ttftMs || 0), 0) / summary.calls.length
    }ms`,
  );
  console.log(`Wrote outputs to: ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

