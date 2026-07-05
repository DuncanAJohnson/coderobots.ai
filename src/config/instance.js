/**
 * Instance configuration selector.
 *
 * Each deployment ("instance") of this app is described by one file in
 * src/config/instances/. The active instance is chosen at build time via the
 * VITE_INSTANCE env var (defaults to 'purdue', the original research-tool
 * deployment). Secrets and endpoint URLs never live here — they stay in
 * VITE_* env vars; instance configs only decide which features are exposed.
 */

const modules = import.meta.glob('./instances/*.js', { eager: true });

const id = import.meta.env.VITE_INSTANCE || 'purdue';
const mod = modules[`./instances/${id}.js`];

if (!mod || !mod.default) {
  const available = Object.keys(modules)
    .map((path) => path.replace('./instances/', '').replace('.js', ''))
    .join(', ');
  throw new Error(
    `Unknown VITE_INSTANCE "${id}". Available instances: ${available}`
  );
}

const instance = mod.default;

export default instance;
