import { buildEsp32Priming } from './priming';
import { stopCode } from './stopCode';

// SunFounder LCD1602 I2C driver — pre-installed on connect so LCD lessons
// work without a manual file upload step. Hardwired to SDA=21, SCL=22,
// matching the SunFounder starter kit's default breadboard wiring.
const lcd1602Driver = `import machine
import time

class LCD():
    def __init__(self, addr=None, blen=1):
        sda = machine.Pin(21)
        scl = machine.Pin(22)
        self.bus = machine.I2C(0,sda=sda, scl=scl, freq=400000)
        self.addr = self.scanAddress(addr)
        self.blen = blen
        self.send_command(0x33)
        time.sleep(0.005)
        self.send_command(0x32)
        time.sleep(0.005)
        self.send_command(0x28)
        time.sleep(0.005)
        self.send_command(0x0C)
        time.sleep(0.005)
        self.send_command(0x01)
        self.bus.writeto(self.addr, bytearray([0x08]))

    def scanAddress(self, addr):
        devices = self.bus.scan()
        if len(devices) == 0:
            raise Exception("No LCD found")
        if addr is not None:
            if addr in devices:
                return addr
            else:
                raise Exception(f"LCD at 0x{addr:2X} not found")
        elif 0x27 in devices:
            return 0x27
        elif 0x3F in devices:
            return 0x3F
        else:
            raise Exception("No LCD found")

    def write_word(self, data):
        temp = data
        if self.blen == 1:
            temp |= 0x08
        else:
            temp &= 0xF7
        self.bus.writeto(self.addr, bytearray([temp]))

    def send_command(self, cmd):
        buf = cmd & 0xF0
        buf |= 0x04
        self.write_word(buf)
        time.sleep(0.002)
        buf &= 0xFB
        self.write_word(buf)
        buf = (cmd & 0x0F) << 4
        buf |= 0x04
        self.write_word(buf)
        time.sleep(0.002)
        buf &= 0xFB
        self.write_word(buf)

    def send_data(self, data):
        buf = data & 0xF0
        buf |= 0x05
        self.write_word(buf)
        time.sleep(0.002)
        buf &= 0xFB
        self.write_word(buf)
        buf = (data & 0x0F) << 4
        buf |= 0x05
        self.write_word(buf)
        time.sleep(0.002)
        buf &= 0xFB
        self.write_word(buf)

    def clear(self):
        self.send_command(0x01)

    def openlight(self):
        self.bus.writeto(self.addr, bytearray([0x08]))

    def write(self, x, y, str):
        if x < 0:
            x = 0
        if x > 15:
            x = 15
        if y < 0:
            y = 0
        if y > 1:
            y = 1
        addr = 0x80 + 0x40 * y + x
        self.send_command(addr)
        for chr in str:
            self.send_data(ord(chr))

    def message(self, text):
        for char in text:
            if char == '\\n':
                self.send_command(0xC0)
            else:
                self.send_data(ord(char))
`;

const esp32Platform = {
  id: 'esp32',
  label: 'ESP32',
  connectionType: 'esp32',
  buildPriming: buildEsp32Priming,
  stopCode,
  postConnectFiles: [
    { path: 'lcd1602.py', content: lcd1602Driver, label: 'LCD1602 driver' },
  ],
};

export default esp32Platform;
