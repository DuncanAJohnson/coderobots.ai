/**
 * Static catalog of all available Fritzing parts.
 *
 * To add a new part:
 *   1. Drop its .fzp and .svg files into src/assets/fritzing/<folder>/
 *   2. Add an entry here.
 *   3. Add its id to the LILYBOT_MPUS or LILYBOT_COMPONENTS list in supabase app_config.
 *
 * Supabase app_config entries are simple id arrays, e.g.:
 *   LILYBOT_MPUS:       ["rpi-picow"]
 *   LILYBOT_COMPONENTS: ["adafruit-tb6612", "hc-sr04"]
 */

const fritzingCatalog = [
  {
    id: 'rpi-picow',
    name: 'Raspberry Pi Pico W',
    kind: 'mpu',
    folder: 'PicoW',
  },
  {
    id: 'adafruit-tb6612',
    name: 'Adafruit TB6612 Motor Driver',
    kind: 'component',
    folder: 'AdafruitTB6612',
  },
  {
    id: 'hc-sr04',
    name: 'HC-SR04 Ultrasonic Distance Sensor',
    kind: 'component',
    folder: 'HC-SR04',
  },
  {
    id: 'arduino-uno-r3',
    name: 'Arduino Uno R3',
    kind: 'mpu',
    folder: 'ArduinoUnoR3',
  },
  {
    id: "led-5mm",
    name: "LED 5mm",
    kind: "component",
    folder: 'LED5mm',
  }
];

export default fritzingCatalog;
