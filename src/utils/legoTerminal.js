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
  const { Terminal, FitAddon } = await ensureDeps();

  const terminal = new Terminal({
    cursorBlink: false,
    cursorStyle: 'bar',
    convertEol: true,
    theme: {
      background: '#191A19',
      foreground: '#F5F2E7',
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
