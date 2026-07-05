import { buildLegoPriming } from './priming';

/**
 * LEGO Education platform: Web Bluetooth devices (SingleMotor, DoubleMotor,
 * ColorSensor, Controller) driven by student Python running in a Pyodide web
 * worker — no serial REPL. stopCode is null because there is no MicroPython
 * paste channel; stopping a run goes through pyodideRunner.interruptPython()
 * + legoDevices.stopAllMotion() in SPIKEEditor's lego-ble path.
 *
 * Requires cross-origin isolation (COOP/COEP headers — see vite.config.js
 * and vercel.json) for the SharedArrayBuffer BLE bridge.
 */
const legoPlatform = {
  id: 'lego',
  label: 'LEGO Education',
  connectionType: 'lego-ble',
  buildPriming: buildLegoPriming,
  stopCode: null,
  tutorHwMode: 'lego',
};

export default legoPlatform;
