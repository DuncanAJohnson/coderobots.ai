/**
 * Local (browser-only) persistence adapter for no-telemetry instances.
 * Implemented in the no-telemetry phase of the unification migration; until
 * then every call throws so accidental use is loud.
 */

function stubGroup(group) {
  return new Proxy(
    {},
    {
      get(_target, name) {
        return () => {
          throw new Error(
            `localAdapter.${group}.${String(name)} is not implemented yet`
          );
        };
      },
    }
  );
}

export default {
  sessions: stubGroup('sessions'),
  logging: stubGroup('logging'),
  usage: stubGroup('usage'),
  profile: stubGroup('profile'),
  hardware: stubGroup('hardware'),
};
