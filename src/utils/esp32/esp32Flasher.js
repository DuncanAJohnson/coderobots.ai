import { ESPLoader, Transport } from 'esptool-js';
import { ESP32_USB_FILTERS } from './esp32UsbFilters.js';

const MONITOR_BAUD = 115200;
const FLASH_BAUD = 921600;

/**
 * @typedef {Object} Esp32Session
 * @property {SerialPort} port
 * @property {import('xterm').Terminal | null} terminal
 * @property {ReadableStreamDefaultReader<Uint8Array> | null} monitorReader
 * @property {Promise<void> | null} monitorPump
 * @property {boolean} monitorStopped
 */

// esptool-js writeFlash expects the image as a *binary string* (each byte as
// a char code), not a Uint8Array. Convert once before handing it off.
const uint8ToBinaryString = (u8) => {
  let s = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < u8.length; i += CHUNK) {
    s += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK));
  }
  return s;
};

const createLoaderTerminal = (xterm) => ({
  clean: () => xterm?.clear(),
  writeLine: (data) => xterm?.writeln(data),
  write: (data) => xterm?.write(data),
});

const startMonitor = (session) => {
  if (!session.port?.readable) return;
  const decoder = new TextDecoder();
  const reader = session.port.readable.getReader();
  session.monitorReader = reader;
  session.monitorStopped = false;

  session.monitorPump = (async () => {
    try {
      while (!session.monitorStopped) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) session.terminal?.write(decoder.decode(value));
      }
    } catch (err) {
      if (!session.monitorStopped) console.warn('ESP32 monitor read error:', err);
    } finally {
      try { reader.releaseLock(); } catch { /* already released */ }
    }
  })();
};

const stopMonitor = async (session) => {
  if (!session?.monitorReader) return;
  session.monitorStopped = true;
  try { await session.monitorReader.cancel(); } catch { /* ignore */ }
  try { await session.monitorPump; } catch { /* ignore */ }
  session.monitorReader = null;
  session.monitorPump = null;
};

/**
 * Request an ESP32 serial port and open it for serial-monitor duty only.
 * Does NOT enter the ROM bootloader — whatever sketch is currently on the
 * chip keeps running. Use {@link flashBinary} to stop it and load a new
 * program.
 */
export const connectEsp32 = async ({ terminal, preselectedPort } = {}) => {
  let port = preselectedPort || null;
  if (!port) {
    port = await navigator.serial.requestPort({ filters: ESP32_USB_FILTERS });
  }

  await port.open({ baudRate: MONITOR_BAUD });

  /** @type {Esp32Session} */
  const session = {
    port,
    terminal: terminal || null,
    monitorReader: null,
    monitorPump: null,
    monitorStopped: false,
  };

  startMonitor(session);
  return session;
};

/**
 * Flash a prebuilt binary to the chip. Stops the serial monitor, hands the
 * port to esptool-js, flashes, hard-resets, then restarts the monitor.
 *
 * @param {Esp32Session} session
 * @param {Uint8Array} binary
 * @param {number} offset
 * @param {(written:number,total:number) => void} [onProgress]
 */
export const flashBinary = async (session, binary, offset, onProgress) => {
  await stopMonitor(session);
  try { await session.port.close(); } catch { /* ignore */ }

  const transport = new Transport(session.port, false);
  const loader = new ESPLoader({
    transport,
    baudrate: FLASH_BAUD,
    romBaudrate: MONITOR_BAUD,
    terminal: session.terminal ? createLoaderTerminal(session.terminal) : undefined,
    enableTracing: false,
  });

  try {
    await loader.main();
    await loader.writeFlash({
      fileArray: [{ data: uint8ToBinaryString(binary), address: offset }],
      flashMode: 'keep',
      flashFreq: 'keep',
      flashSize: 'keep',
      eraseAll: false,
      compress: true,
      reportProgress: (_i, written, total) => onProgress?.(written, total),
    });
    await loader.after('hard_reset');
  } finally {
    try { await transport.disconnect(); } catch { /* ignore */ }
  }

  await session.port.open({ baudRate: MONITOR_BAUD });
  startMonitor(session);
};

/**
 * Hard-reset the board via a short esptool-js round-trip. For the XIAO
 * ESP32-C3 (native USB-JTAG) this is the only reliable way to reset from
 * the browser — DTR/RTS toggles do nothing on native-USB chips.
 */
export const resetEsp32 = async (session) => {
  if (!session?.port) return;
  await stopMonitor(session);
  try { await session.port.close(); } catch { /* ignore */ }

  const transport = new Transport(session.port, false);
  const loader = new ESPLoader({
    transport,
    baudrate: MONITOR_BAUD,
    romBaudrate: MONITOR_BAUD,
    enableTracing: false,
  });

  try {
    await loader.main();
    await loader.after('hard_reset');
  } catch (err) {
    console.warn('ESP32 reset failed:', err);
  } finally {
    try { await transport.disconnect(); } catch { /* ignore */ }
  }

  try { await session.port.open({ baudRate: MONITOR_BAUD }); } catch { /* ignore */ }
  startMonitor(session);
};

/**
 * Fully close a session and release the port.
 */
export const disconnectEsp32 = async (session) => {
  if (!session) return;
  await stopMonitor(session);
  try {
    if (session.port?.readable || session.port?.writable) {
      await session.port.close();
    }
  } catch { /* already closed */ }
};
