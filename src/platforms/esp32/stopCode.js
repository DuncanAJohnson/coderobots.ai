// Halt all ESP32 hardware on connect. Iterates an explicit allowlist of
// output-capable GPIOs — never touches GPIO 6-11 (internal flash) or the
// input-only pins 34/35/36/39. try/except around each pin so a single bad
// state never blocks the rest.
export const stopCode = `
from machine import Pin, PWM
_safe_pins = [0, 2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33]
for _pin in _safe_pins:
    try:
        _pwm = PWM(Pin(_pin))
        _pwm.deinit()
    except Exception:
        pass
    try:
        Pin(_pin, Pin.OUT).value(0)
    except Exception:
        pass
`;
