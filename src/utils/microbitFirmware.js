import {
  ConnectionStatus,
  DeviceSelectionMode,
  createUniversalHexFlashDataSource,
  createWebUSBConnection,
} from '@microbit/microbit-connection';
import microbitFirmwareHex from '../assets/microbit-v2-micropython-v2.1.1.hex?raw';

const noop = () => {};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const firmwareDataSource = createUniversalHexFlashDataSource(microbitFirmwareHex);

export const shouldInstallMicrobitFirmware = (error) => {
  const message = error?.message || '';
  return /did not respond like a MicroPython REPL|Timed out while waiting|not a compatible MicroPython REPL/i.test(message);
};

export const isUserGestureError = (error) => {
  const message = error?.message || '';
  return /Must be handling a user gesture/i.test(message);
};

export const isNoDeviceSelectedError = (error) => {
  const message = error?.message || '';
  return /No device selected|no-device-selected/i.test(message);
};

const isRetryableWebUsbError = (error) => {
  const message = error?.message || '';
  const code = error?.code || '';
  return (
    /Bad response for 8 -> 17/i.test(message) ||
    /\b521\b/.test(message) ||
    /reconnect-microbit/i.test(code) ||
    /clear-connect/i.test(code) ||
    /timeout/i.test(code)
  );
};

export const openMicrobitInstallerSession = async ({
  allowDevicePrompt = true,
  onStatus = noop,
} = {}) => {
  if (!('usb' in navigator) || !navigator.usb) {
    throw new Error('WebUSB is not available in this browser. Use a Chromium-based browser to install micro:bit MicroPython.');
  }

  const usbConnection = createWebUSBConnection({
    deviceSelectionMode: allowDevicePrompt ? DeviceSelectionMode.AlwaysAsk : DeviceSelectionMode.UseAnyAllowed,
  });

  try {
    await usbConnection.initialize();

    if (allowDevicePrompt) {
      onStatus('Select your micro:bit in the USB prompt to enable auto-install...');
    }
    let status;
    try {
      status = await usbConnection.connect();
    } catch (error) {
      if (!isRetryableWebUsbError(error)) {
        throw error;
      }
      onStatus('WebUSB handshake failed. Retrying once...');
      await sleep(300);
      try {
        status = await usbConnection.connect();
      } catch (retryError) {
        if (!allowDevicePrompt || !isRetryableWebUsbError(retryError)) {
          throw retryError;
        }
        onStatus('WebUSB still unstable. Please re-select micro:bit in USB prompt...');
        await usbConnection.clearDevice();
        status = await usbConnection.connect();
      }
    }
    if (status !== ConnectionStatus.CONNECTED) {
      throw new Error('Unable to connect to micro:bit over WebUSB for firmware install.');
    }

    return {
      flashBundledFirmware: async ({ onStatus: flashStatus = noop, onProgress = noop } = {}) => {
        flashStatus('Installing MicroPython on micro:bit. This can take up to a minute...');
        const runFlash = async () => usbConnection.flash(firmwareDataSource, {
          partial: false,
          progress: (percentage) => {
            if (typeof percentage === 'number') {
              const pct = Math.max(0, Math.min(100, Math.round(percentage * 100)));
              onProgress(pct);
            } else {
              onProgress(undefined);
            }
          },
        });

        try {
          await runFlash();
        } catch (error) {
          if (!isRetryableWebUsbError(error)) {
            throw error;
          }
          flashStatus('Flash link dropped. Reconnecting and retrying once...');
          await sleep(300);
          try {
            await usbConnection.connect();
          } catch (reconnectError) {
            if (!isRetryableWebUsbError(reconnectError)) {
              throw reconnectError;
            }
            throw new Error('WebUSB flashing link stayed unstable. Unplug/replug micro:bit, then click Connect micro:bit again.');
          }
          await runFlash();
        }
        flashStatus('MicroPython installation complete. Reconnecting...');
        return { status: 'installed' };
      },
      close: async () => {
        try {
          await usbConnection.disconnect();
        } catch {}
        usbConnection.dispose();
      },
    };
  } catch (error) {
    try {
      await usbConnection.disconnect();
    } catch {}
    usbConnection.dispose();
    throw error;
  }
};
