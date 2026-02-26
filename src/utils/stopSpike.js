export const STOP_CODE_LILYBOT = `
from machine import Pin, PWM

# Motor Pins Setup
PWMA = PWM(Pin(28))
AIN2 = Pin(27, Pin.OUT)
AIN1 = Pin(26, Pin.OUT)
PWMA.freq(60)

BIN1 = Pin(22, Pin.OUT)
BIN2 = Pin(21, Pin.OUT)
PWMB = PWM(Pin(20))
PWMB.freq(60)

def stop():
    AIN1.value(0)
    AIN2.value(0)
    BIN1.value(0)
    BIN2.value(0)
    PWMA.duty_u16(0)
    PWMB.duty_u16(0)

stop()
`;
