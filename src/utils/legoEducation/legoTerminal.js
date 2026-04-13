/**
 * Lightweight xterm.js terminal for LEGO Education mode.
 *
 * Reuses the same CDN-hosted xterm version as microRepl.js so both paths
 * share a single xterm download in the browser cache. This terminal has no
 * serial attached — it's a pure sink for Pyodide stdout/stderr.
 */

const CDN = 'https://cdn.jsdelivr.net/npm';
const XTERM = '5.3.0';
const ADDON_FIT = '0.10.0';

let depsPromise = null;

// xterm 5.3's Viewport schedules `syncScrollArea()` via setTimeout(0) from
// its constructor, and `_innerRefresh` fires in another deferred callback.
// Both call into RenderService.dimensions, which reads `_renderer.value` —
// and that can still be undefined by the time the timer fires, producing
// an UNCAUGHT "Cannot read properties of undefined (reading 'dimensions')"
// that we can't swallow at the call site because it happens in a later
// task. The terminal still works fine after this — the first render just
// loses a frame. Install a one-time global filter that silences it.
let globalHandlerInstalled = false;
function installXtermErrorShield() {
  if (globalHandlerInstalled || typeof window === 'undefined') return;
  globalHandlerInstalled = true;
  const isXtermDimensionsError = (msg, stack) => {
    if (typeof msg === 'string' && msg.includes("reading 'dimensions'")) return true;
    if (typeof stack === 'string' && stack.includes('RenderService')) return true;
    return false;
  };
  window.addEventListener('error', (ev) => {
    if (isXtermDimensionsError(ev.message, ev.error?.stack)) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    }
  }, true);
  window.addEventListener('unhandledrejection', (ev) => {
    const r = ev.reason;
    if (isXtermDimensionsError(r?.message, r?.stack)) {
      ev.preventDefault();
    }
  });
}

// Poll requestAnimationFrame until `el` has a non-zero layout box. Bails
// after ~1s so we don't wait forever on a detached node.
function waitForLayout(el) {
  return new Promise((resolve) => {
    let tries = 0;
    const check = () => {
      tries += 1;
      if (!el || !el.isConnected) return resolve();
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return resolve();
      if (tries > 60) return resolve();
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
}

function ensureDeps() {
  if (depsPromise) return depsPromise;

  const href = `${CDN}/xterm@${XTERM}/css/xterm.min.css`;
  if (!document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  depsPromise = Promise.all([
    import(/* @vite-ignore */ `${CDN}/xterm@${XTERM}/+esm`),
    import(/* @vite-ignore */ `${CDN}/@xterm/addon-fit@${ADDON_FIT}/+esm`),
  ]).then(([{ Terminal }, { FitAddon }]) => ({ Terminal, FitAddon }));

  return depsPromise;
}

/**
 * Create a terminal mounted in `target`, return a small controller object.
 *
 * @param {HTMLElement} target
 * @returns {Promise<{write: (s:string)=>void, clear: ()=>void, dispose: ()=>void, fit: ()=>void, terminal: any}>}
 */
export async function createLegoTerminal(target) {
  installXtermErrorShield();
  const { Terminal, FitAddon } = await ensureDeps();

  // Wait for the host element to actually have layout before opening.
  await waitForLayout(target);
  // Also wait for fonts to load — xterm measures glyph size on open().
  try { if (document.fonts?.ready) await document.fonts.ready; } catch {}

  const terminal = new Terminal({
    cursorBlink: true,
    cursorStyle: 'block',
    convertEol: true,
    theme: {
      background: '#191A19',
      foreground: '#F5F2E7',
      cursor: '#F5F2E7',
      selectionBackground: '#F5F2E7',
      selectionForeground: '#191A19',
    },
  });

  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.open(target);
  try { fitAddon.fit(); } catch {}

  const controller = {
    terminal,
    write: (s) => terminal.write(s),
    clear: () => terminal.clear(),
    fit: () => { try { fitAddon.fit(); } catch {} },
    dispose: () => {
      try { terminal.dispose(); } catch {}
    },
  };

  return controller;
}
