import brand from '../brand';

/**
 * Danish SkoleGPT instance: no data collection (localStorage persistence,
 * anonymous), Danish-first localization, tutor-pipeline chat over the
 * self-hosted SkoleGPT model. ESP32 is the C++/Arduino flavor (Modal
 * compile service + browser flashing), not the MicroPython one — set
 * VITE_ESP32_COMPILE_URL alongside VITE_MODAL_TUTOR_ENDPOINT_URL.
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

  platforms: ['lego', 'microbit', 'esp32-arduino'],

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
