import { ESPLoader, Transport, UsbJtagSerialReset } from 'esptool-js';
import { ESP32_USB_FILTERS } from './esp32UsbFilters.js';

const MONITOR_BAUD = 115200;
// The XIAO ESP32-C3 talks to the browser over native USB-JTAG (USB-CDC),
// not a real UART, so baud rate is ignored by the hardware. Asking
// esptool-js to change baud (e.g. 115200 -> 921600) issues a SET_BAUD
// round-trip after stub upload that occasionally kills the read stream
// with "Serial data stream stopped". Keeping flash baud == monitor baud
// skips that step entirely with no real-world throughput cost.
const FLASH_BAUD = MONITOR_BAUD;
// Wait long enough after the DTR/RTS reset dance for the chip to come out
// of the bootrom, run setup(), and call Serial.begin() — that's when the
// new sketch's USB-CDC starts pumping output.
const POST_RESET_SETTLE_MS = 1500;
// On the XIAO ESP32-C3 the USB-JTAG bridge in ROM survives the chip reset,
// so navigator.serial never fires disconnect/connect. The first port.open()
// after transport.disconnect() returns a readable stream that's silently
// dead; closing and reopening once more is what the manual Disconnect→Connect
// flow does, and it produces a stream that actually pumps data.
const POST_OPEN_CYCLE_MS = 200;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const reattachAfterReset = async (session) => {
  session.terminal?.write?.('\r\n\x1b[33mReconnecting...\x1b[0m\r\n');
  await sleep(POST_RESET_SETTLE_MS);

  // Defensive: transport.disconnect() should have closed the port, but if
  // it didn't (or threw mid-way), make sure we start from a closed state.
  try { await session.port.close(); } catch { /* already closed */ }

  try {
    await session.port.open({ baudRate: MONITOR_BAUD });
  } catch (err) {
    session.terminal?.writeln?.(
      `\x1b[31mFailed to reopen ESP32 port: ${err.message || err}\x1b[0m`,
    );
    return;
  }

  // Cycle once more — the first open() after a flash hands back a dead
  // readable stream. This second close/open is what unblocks it.
  try { await session.port.close(); } catch { /* ignore */ }
  await sleep(POST_OPEN_CYCLE_MS);
  try {
    await session.port.open({ baudRate: MONITOR_BAUD });
  } catch (err) {
    session.terminal?.writeln?.(
      `\x1b[31mFailed to reopen ESP32 port: ${err.message || err}\x1b[0m`,
    );
    return;
  }

  startMonitor(session);
};

/**
 * @typedef {Object} Esp32Session
 * @property {SerialPort} port
 * @property {import('xterm').Terminal | null} terminal
 * @property {ReadableStreamDefaultReader<Uint8Array> | null} monitorReader
 * @property {Promise<void> | null} monitorPump
 * @property {boolean} monitorStopped
 * @property {boolean} bootloaderFlashed  Set after a successful full flash so
 *   subsequent iterations can skip writing the bootloader/partition table.
 * @property {string | null} lastPartitionsHash  sha256 of the partition table
 *   from the last full flash. If a new compile changes it, we force a full
 *   flash again so the chip doesn't boot-loop.
 */

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
    bootloaderFlashed: false,
    lastPartitionsHash: null,
  };

  startMonitor(session);
  return session;
};

/**
 * Flash a sketch to the chip. The compile backend returns BOTH a merged
 * binary (bootloader + partitions + boot_app0 + app at 0x0) and the raw
 * app binary (just the sketch at 0x10000). For fast iteration we flash
 * only the app once the bootloader and partition table are known to be
 * in place — this skips writing ~50–100 KB every iteration.
 *
 * @param {Esp32Session} session
 * @param {Object} payload
 * @param {Uint8Array | null} payload.merged       Merged binary (offset 0x0)
 * @param {number} payload.mergedOffset            Offset for merged (0x0)
 * @param {Uint8Array | null} payload.app          App-only binary (offset 0x10000)
 * @param {number} payload.appOffset               Offset for app (0x10000)
 * @param {string | null} [payload.partitionsHash] sha256 of partition table
 * @param {'auto' | 'full' | 'app'} [payload.mode] Force full / app, or auto
 * @param {(written:number,total:number) => void} [onProgress]
 */
export const flashBinary = async (session, payload, onProgress) => {
  const {
    merged, mergedOffset = 0x0,
    app, appOffset = 0x10000,
    partitionsHash = null,
    mode = 'auto',
  } = payload || {};

  // Decide what to write.
  let useAppOnly;
  if (mode === 'full') useAppOnly = false;
  else if (mode === 'app') useAppOnly = true;
  else {
    const partitionsChanged =
      partitionsHash && session.lastPartitionsHash &&
      partitionsHash !== session.lastPartitionsHash;
    useAppOnly = session.bootloaderFlashed && !partitionsChanged && !!app;
  }

  let fileArray;
  if (useAppOnly) {
    if (!app) throw new Error('App-only flash requested but no app binary provided');
    fileArray = [{ data: app, address: appOffset }];
  } else {
    if (!merged) {
      // Fall back to app-only at 0x10000 if the backend didn't produce a merged.bin.
      if (!app) throw new Error('No binary to flash');
      fileArray = [{ data: app, address: appOffset }];
      useAppOnly = true;
    } else {
      fileArray = [{ data: merged, address: mergedOffset }];
    }
  }

  session.terminal?.write?.(
    `\r\n\x1b[36m[flash] mode=${useAppOnly ? 'app-only' : 'full'} ` +
    `bytes=${fileArray[0].data.length}\x1b[0m\r\n`,
  );

  await stopMonitor(session);
  try { await session.port.close(); } catch { /* ignore */ }

  const transport = new Transport(session.port, false);
  const loader = new ESPLoader({
    transport,
    baudrate: FLASH_BAUD,
    romBaudrate: MONITOR_BAUD,
    terminal: session.terminal ? createLoaderTerminal(session.terminal) : undefined,
    enableTracing: false,
    resetConstructors: {
      hardReset: (t) => new UsbJtagSerialReset(t),
    },
  });

  let flashedOk = false;
  try {
    await loader.main();
    await loader.writeFlash({
      fileArray,
      flashMode: 'keep',
      flashFreq: 'keep',
      flashSize: 'keep',
      compress: true,
      reportProgress: (_i, written, total) => onProgress?.(written, total),
    });
    flashedOk = true;
    await loader.after('hard_reset');
  } finally {
    try { await transport.disconnect(); } catch { /* ignore */ }
  }

  if (flashedOk && !useAppOnly) {
    session.bootloaderFlashed = true;
    session.lastPartitionsHash = partitionsHash;
  }

  await reattachAfterReset(session);
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
    resetConstructors: {
      hardReset: (t) => new UsbJtagSerialReset(t),
    },
  });

  try {
    await loader.main();
    await loader.after('hard_reset');
  } catch (err) {
    console.warn('ESP32 reset failed:', err);
  } finally {
    try { await transport.disconnect(); } catch { /* ignore */ }
  }

  await reattachAfterReset(session);
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
