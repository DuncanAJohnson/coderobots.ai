// USB VendorID/ProductID filters for ESP32 boards.
//
// XIAO ESP32-C3 uses the built-in USB-Serial/JTAG device on the ESP32-C3
// chip itself (Espressif VID 0x303a, PID 0x1001 — the generic native USB).
//
// TODO: add additional filters when broadening support:
//   - Silicon Labs CP210x (many DevKitC boards):   0x10c4 / 0xea60
//   - WCH CH340/CH341 (cheap clones):              0x1a86 / 0x7523
//   - FTDI FT232R:                                 0x0403 / 0x6001
//   - Native USB on ESP32-S2/S3 variants:          0x303a / 0x0002, etc.

export const ESP32_USB_FILTERS = [
  { usbVendorId: 0x303a, usbProductId: 0x1001 },
];

export const findAuthorizedEsp32SerialPort = async () => {
  if (!navigator.serial?.getPorts) return null;
  const ports = await navigator.serial.getPorts();
  return (
    ports.find((p) => {
      const info = p.getInfo?.() || {};
      return ESP32_USB_FILTERS.some(
        (f) =>
          info.usbVendorId === f.usbVendorId &&
          info.usbProductId === f.usbProductId,
      );
    }) || null
  );
};

/**
 * Poll navigator.serial.getPorts() until an ESP32 port (re)appears. Used
 * after a hard reset, when the native USB-JTAG interface re-enumerates and
 * the pre-reset SerialPort handle is no longer valid.
 */
export const waitForEsp32SerialPort = async (timeoutMs = 6000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const port = await findAuthorizedEsp32SerialPort();
    if (port) return port;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return null;
};
