import brand from '../brand';

/**
 * Danish SkoleGPT instance: no data collection (localStorage persistence,
 * anonymous), Danish-first localization, tutor-pipeline chat over the
 * self-hosted SkoleGPT model.
 *
 * Stub until the no-telemetry wiring lands; platform 'lego' and chat mode
 * 'tutor' become functional in later phases of the unification migration.
 */
const config = {
  id: 'skolegpt-dk',
  brand: {
    ...brand,
    name: 'CodeRobots SkoleGPT',
    logoSrc: null,
    logoAlt: null,
  },

  telemetry: false,

  platforms: ['lego', 'microbit', 'esp32'],

  chat: {
    mode: 'tutor',
    showBudgetUI: false,
  },

  locales: {
    available: ['da', 'en'],
    default: 'da',
  },

  routes: {
    admin: false,
  },
};

export default config;
