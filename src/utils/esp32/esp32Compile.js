const COMPILE_URL = import.meta.env.VITE_ESP32_COMPILE_URL;

const base64ToUint8Array = (b64) => {
  if (!b64) return null;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

export class Esp32CompileError extends Error {
  constructor(message, { stderr = '', stdout = '' } = {}) {
    super(message);
    this.name = 'Esp32CompileError';
    this.stderr = stderr;
    this.stdout = stdout;
  }
}

/**
 * Compile an Arduino sketch via the Modal backend.
 * @param {string} sketch  Arduino source
 * @param {string} [board] FQBN, defaults to XIAO ESP32-C3
 * @returns {Promise<{
 *   merged: Uint8Array | null,
 *   mergedOffset: number,
 *   app: Uint8Array | null,
 *   appOffset: number,
 *   partitionsHash: string | null,
 *   cacheHit: boolean,
 *   stdout: string,
 * }>}
 */
export const compileSketch = async (sketch, board = 'esp32:esp32:XIAO_ESP32C3') => {
  if (!COMPILE_URL) {
    throw new Esp32CompileError(
      'VITE_ESP32_COMPILE_URL is not set — cannot compile ESP32 sketches.',
    );
  }

  const response = await fetch(COMPILE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sketch, board }),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    throw new Esp32CompileError(`Compile service returned non-JSON (HTTP ${response.status})`);
  }

  if (!response.ok || !payload?.ok) {
    const msg =
      payload?.stderr?.trim() ||
      payload?.error ||
      `Compile service returned HTTP ${response.status}`;
    throw new Esp32CompileError(msg, {
      stderr: payload?.stderr || '',
      stdout: payload?.stdout || '',
    });
  }

  return {
    merged: base64ToUint8Array(payload.binary),
    mergedOffset: payload.flash_offset ?? 0x0,
    app: base64ToUint8Array(payload.app_binary),
    appOffset: payload.app_offset ?? 0x10000,
    partitionsHash: payload.partitions_hash || null,
    cacheHit: payload.cache_hit === true,
    stdout: payload.stdout || '',
  };
};
