import { buildEsp32ArduinoPriming } from './priming';

// A valid empty sketch — the shared '# Start your project here!' default is a
// Python comment and would fail arduino-cli compilation.
const starterSketch = `void setup() {
  Serial.begin(115200);
}

void loop() {
}
`;

/**
 * ESP32 (C++/Arduino) platform: SmartMotor hub (XIAO ESP32-C3). Sketches are
 * compiled server-side by the Modal arduino-cli service
 * (modal_functions/esp32_compile.py, endpoint in VITE_ESP32_COMPILE_URL) and
 * flashed over WebSerial via esptool-js (src/utils/esp32/esp32Flasher.js) —
 * no REPL, so stopCode is null; "stop" hard-resets the board and the flashed
 * sketch restarts from setup().
 *
 * Distinct from the 'esp32' platform, which runs MicroPython over a serial
 * REPL (SunFounder kit).
 */
const esp32ArduinoPlatform = {
  id: 'esp32-arduino',
  label: 'ESP32 (C++/Arduino)',
  connectionType: 'esp32-arduino',
  buildPriming: buildEsp32ArduinoPriming,
  stopCode: null,
  editorLanguage: 'cpp',
  starterCode: starterSketch,
  tutorHwMode: 'esp32',
};

export default esp32ArduinoPlatform;
