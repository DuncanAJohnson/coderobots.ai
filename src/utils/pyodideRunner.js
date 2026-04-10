/**
 * Pyodide runner — lazy-loaded Python-in-the-browser for LEGO Education mode.
 *
 * On first call to ensurePyodide() we:
 *   1. Inject Pyodide's loader script from jsdelivr into <head>.
 *   2. Call loadPyodide() to initialise the runtime.
 *   3. Fetch /legoeducation.py from /public and write it to Pyodide's FS so
 *      `import legoeducation as le` works in user code.
 *   4. Wire stdout/stderr into caller-supplied callbacks.
 *
 * Subsequent calls return the cached runtime. Only one ensurePyodide() call
 * is active at a time; concurrent callers share the same init promise.
 */

const PYODIDE_VERSION = 'v0.26.4';
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/pyodide.js`;
const PYODIDE_INDEX = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;

let loaderPromise = null;
let pyodidePromise = null;
let pyodideInstance = null;
let currentStdout = null;
let currentStderr = null;

function loadLoaderScript() {
  if (window.loadPyodide) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PYODIDE_URL;
    script.async = true;
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error('Failed to load Pyodide loader script')));
    document.head.appendChild(script);
  });
  return loaderPromise;
}

async function initPyodide() {
  await loadLoaderScript();
  // eslint-disable-next-line no-undef
  const pyodide = await loadPyodide({
    indexURL: PYODIDE_INDEX,
    stdout: (s) => { if (currentStdout) currentStdout(s + '\n'); },
    stderr: (s) => { if (currentStderr) currentStderr(s + '\n'); },
  });

  // Fetch the LEGO wrapper module and drop it into Pyodide's virtual FS so
  // student code can `import legoeducation as le`.
  const res = await fetch('/legoeducation.py', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to fetch /legoeducation.py: ${res.status}`);
  const source = await res.text();
  pyodide.FS.writeFile('legoeducation.py', source, { encoding: 'utf8' });

  pyodideInstance = pyodide;
  return pyodide;
}

/**
 * Load Pyodide (if not already loaded) and wire stdout/stderr callbacks.
 * Repeated calls just update the callbacks on the existing runtime.
 *
 * @param {{ onStdout?: (s: string) => void, onStderr?: (s: string) => void }} opts
 */
export async function ensurePyodide({ onStdout, onStderr } = {}) {
  if (onStdout) currentStdout = onStdout;
  if (onStderr) currentStderr = onStderr;
  if (pyodideInstance) return pyodideInstance;
  if (!pyodidePromise) pyodidePromise = initPyodide();
  try {
    return await pyodidePromise;
  } catch (err) {
    pyodidePromise = null; // allow retry
    throw err;
  }
}

/**
 * Run a block of Python code. Stdout/stderr are streamed through the
 * callbacks previously supplied to ensurePyodide().
 *
 * Resolves when the script finishes. Rejects with an error whose message
 * contains the Python traceback; the traceback is also written to stderr.
 */
export async function runPython(code) {
  if (!pyodideInstance) {
    throw new Error('Pyodide is not initialised yet. Call ensurePyodide() first.');
  }
  try {
    await pyodideInstance.runPythonAsync(code);
  } catch (err) {
    const msg = err?.message || String(err);
    if (currentStderr) currentStderr(msg + '\n');
    throw err;
  }
}

export function isPyodideReady() {
  return pyodideInstance !== null;
}
