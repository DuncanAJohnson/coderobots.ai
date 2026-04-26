"""micro:bit hardware doc bundles.

Sourced from src/prompts/microbit_priming.js. Bundle split:
display_audio, sensors, pins_io, wireless, protocols, timing.
"""

PREAMBLE = """\
You are helping a student write MicroPython for a BBC micro:bit (v2). Use only
modules part of the official micro:bit MicroPython runtime. Most components are
exposed via 'from microbit import *'.

When responding with code, format the code block as ```python and comment thoroughly.
The student cannot see the documentation; never reference "above" or "the docs".
"""

_DISPLAY_AUDIO = """\
--- display ---
'display' is a 5x5 LED matrix.
- display.show(image)                      # built-in or custom Image
- display.show(iterable, delay=400)        # animate sequence
- display.scroll(string, delay=150)
- display.set_pixel(x, y, brightness)      # x/y 0-4, brightness 0-9
- display.get_pixel(x, y)
- display.clear()
- display.on() / display.off()

Built-in images: Image.HEART, HAPPY, SAD, SMILE, ANGRY, CONFUSED, ASLEEP, SURPRISED,
SILLY, FABULOUS, YES, NO, ARROW_N..ARROW_NW, CLOCK1..CLOCK12, SKULL, DUCK, HOUSE,
DIAMOND, DIAMOND_SMALL, SQUARE, SQUARE_SMALL, RABBIT, COW, MUSIC_CROTCHET,
MUSIC_QUAVER, MUSIC_QUAVERS, PITCHFORK, XMAS, PACMAN, TARGET, TSHIRT, ROLLERSKATE,
STICKFIGURE, GHOST, SWORD, GIRAFFE, UMBRELLA, SNAKE, TRIANGLE, TORTOISE, BUTTERFLY,
MEH.

Custom images: Image('09090:99999:99999:09990:00900') — five rows of five 0-9 brightness digits, separated by colons.

--- music ---
'import music'.
- music.play(melody)                       # e.g. ['C4:4', 'E4:4', 'G4:4']
- music.pitch(frequency, duration=-1)      # -1 = continuous
- music.stop()
- music.set_tempo(ticks=4, bpm=120)
Notes: 'NOTE[OCTAVE][:DURATION]' (e.g. 'C4:4', 'R:2' for rest).
Built-in melodies: DADADADUM, ENTERTAINER, PRELUDE, ODE, NYAN, RINGTONE, FUNK,
BLUES, BIRTHDAY, WEDDING, FUNERAL, PUNCHLINE, PYTHON, BADDY, CHASE, BA_DING,
WAWAWAWAA, JUMP_UP, JUMP_DOWN, POWER_UP, POWER_DOWN.

--- speaker (v2) ---
'speaker.on() / speaker.off()' to enable/disable the on-board speaker.

--- microphone (v2) ---
- microphone.current_event() -> SoundEvent.LOUD or SoundEvent.QUIET
- microphone.was_event(event)
- microphone.sound_level()             # 0-255
- microphone.set_threshold(event, value)
"""

_SENSORS = """\
--- buttons ---
'button_a' and 'button_b'.
- button.is_pressed()                  # currently pressed
- button.was_pressed()                 # since last call (clears flag)
- button.get_presses()                 # count since last call (clears)

--- accelerometer ---
- accelerometer.get_x() / get_y() / get_z()    # milli-g, -2000..2000
- accelerometer.get_values() -> (x, y, z)
- accelerometer.current_gesture() -> str
- accelerometer.is_gesture(name)
- accelerometer.was_gesture(name)
Gestures: 'up', 'down', 'left', 'right', 'face up', 'face down', 'freefall',
'shake', '3g', '6g', '8g'.

--- temperature & compass ---
- temperature() -> degrees C (approximate)
- compass.calibrate()
- compass.heading()                    # 0-359
- compass.get_field_strength()         # nanotesla
"""

_PINS_IO = """\
--- pins ---
pin0..pin20. Large pads (pin0/1/2) support analog and touch.
- pin.read_digital() -> 0/1
- pin.write_digital(value)
- pin.read_analog() -> 0-1023 (10-bit ADC)
- pin.write_analog(value) -> PWM duty 0-1023
- pin.set_analog_period(ms)
- pin.is_touched()                     # pin0/1/2 and the v2 logo

--- servo control ---
Servos via PWM:
- pin0.set_analog_period(20)           # 50 Hz
- pin0.write_analog(value)             # ~26=0deg, ~51=90deg, ~77=180deg
"""

_WIRELESS = """\
--- radio ---
'import radio' for wireless between micro:bits.
- radio.on() / radio.off()
- radio.config(group=0, channel=7, power=6, length=32)
    group 0-255 (only same group communicates), power 0-7
- radio.send(message)                  # string
- radio.receive() -> str | None

--- neopixel ---
'import neopixel' for WS2812 strips.
- np = neopixel.NeoPixel(pin0, n)
- np[i] = (r, g, b)                    # 0-255 each
- np.show()
- np.clear()
"""

_PROTOCOLS = """\
--- I2C ---
'i2c' available after 'from microbit import *'.
- i2c.init(freq=100000, sda=pin20, scl=pin19)
- i2c.scan() -> list of addresses
- i2c.read(addr, n)
- i2c.write(addr, buf)

--- SPI ---
'spi' available after 'from microbit import *'.
- spi.init(baudrate=1000000, bits=8, mode=0, sclk=pin13, mosi=pin15, miso=pin14)
- spi.read(nbytes)
- spi.write(buf)
- spi.write_readinto(out, in_buf)
"""

_TIMING = """\
--- sleep & timing ---
- sleep(ms)                            # pause for ms
- running_time()                       # ms since boot
- 'import utime' for utime.ticks_ms(), utime.ticks_diff(), etc.
"""

EXAMPLES = """\
EXAMPLES:

Prompt: "Vis et hjerte paa displayet"
```python
from microbit import *

# Viser et hjerte-ikon paa LED-displayet
display.show(Image.HEART)
```

---

Prompt: "Lav en terning der viser et tilfaeldigt tal naar man ryster micro:bitten"
```python
from microbit import *
import random

while True:
    if accelerometer.was_gesture('shake'):
        tal = random.randint(1, 6)
        display.show(tal)
    sleep(100)
```

---

Prompt: "Send en besked fra en micro:bit til en anden via radio"
```python
import radio
from microbit import *

radio.on()
radio.config(group=1)

while True:
    if button_a.was_pressed():
        radio.send('hej')
        display.scroll('Sendt!')
    besked = radio.receive()
    if besked is not None:
        display.scroll(besked)
    sleep(100)
```

---

Prompt: "Spil en melodi"
```python
from microbit import *
import music

music.play(music.BIRTHDAY)
display.show(Image.HAPPY)
```
"""

BUNDLES: dict[str, str] = {
    "display_audio": _DISPLAY_AUDIO,
    "sensors": _SENSORS,
    "pins_io": _PINS_IO,
    "wireless": _WIRELESS,
    "protocols": _PROTOCOLS,
    "timing": _TIMING,
}
