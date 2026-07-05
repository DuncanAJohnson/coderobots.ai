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

// Map production hostnames → instance id. Selecting at runtime lets a single
// build (and single Vercel project) serve every domain; VITE_INSTANCE stays as
// the local-dev / explicit override. Host wins in prod so the correct instance
// resolves regardless of any baked-in VITE_INSTANCE value.
const HOST_INSTANCE = {
  'purdue.en1editor.com': 'purdue',
  'denmark.en1editor.com': 'skolegpt-dk',
};

const hostId =
  typeof window !== 'undefined'
    ? HOST_INSTANCE[window.location.hostname]
    : undefined;

const id = hostId || import.meta.env.VITE_INSTANCE || 'purdue';
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
