"""SPIKE Prime hardware doc bundles.

Sourced from src/prompts/spike_priming.js. Split into router-pickable bundles:
motors, motor_pair, sensors, hub_io, runloop. The role-and-format header lives in
PREAMBLE; example prompts live in EXAMPLES (always included).
"""

PREAMBLE = """\
You are helping a student write Python to control a SPIKE 3 robot. The SPIKE 3
MicroPython runtime was just updated, so only use modules widely supported across
MicroPython versions plus the modules described in the bundles below.

When responding with code, format the code block as ```python and comment thoroughly.
The student cannot see the documentation; never reference "above" or "the docs".
"""

_MOTORS = """\
--- motor module ---
Use 'import motor'. All functions are called as motor.<func>(...).
Do NOT 'import motor from hub' — motor is a top-level module.

Common arguments:
- 'port': from the 'port' submodule of hub, e.g. port.A
- 'velocity': angular velocity in degrees per second (may be negative)
- 'degrees': angle in degrees (target or amount, depending on context)
- 'duration': time in milliseconds

Functions:
- motor.absolute_position(port) -> int            # absolute angle in degrees
- motor.run(port, velocity)                       # non-blocking, awaitable
- motor.run_for_time(port, duration, velocity)    # non-blocking, awaitable
- motor.run_to_absolute_position(port, position, velocity)
- motor.run_to_relative_position(port, position, velocity)
- motor.stop(port)                                # use this rather than motor.run(port, 0)
"""

_MOTOR_PAIR = """\
--- motor_pair module ---
'import motor_pair'. Used for synchronised drivebase-style movement.

motor_pair.pair(motor_pair.PAIR_1, port.A, port.B)
Constants PAIR_1, PAIR_2, PAIR_3 (values 0/1/2) — three pairs are available.
For beginners, alias for clarity: my_motors = motor_pair; AB = motor_pair.PAIR_1.

move(pair, steering, *, velocity=360, acceleration=1000) -> None
- 'steering' is -100..100; 0 is straight forward.
- 'velocity' is keyword-only and refers to the fastest motor in the pair.
- Example: my_motors.move(AB, 0, velocity=600)
- Using a keyword for steering causes an error.

move_tank(pair, left_velocity, right_velocity, *, acceleration=1000) -> None
- Each motor's velocity is positional. Keyword-arg use for left/right_velocity errors.
- Example: my_motors.move_tank(AB, 600, 600)

Stop a pair with my_motors.stop(AB).

ALWAYS unpair when done: my_motors.unpair(AB).
"""

_SENSORS = """\
--- distance_sensor module ---
'import distance_sensor'. Call as distance_sensor.distance(port.A).
distance(port) returns mm. -1 means nothing in range. Pressed up against returns ~40,
~3 ft (max reliable) returns ~500. Beyond that: -1 or large noisy values.

--- force_sensor module ---
'import force_sensor'. All functions take a single 'port' argument.
- force(port) -> percentage of maximum force
- pressed(port) -> bool
- raw(port) -> raw force value

--- color_sensor module ---
'import color_sensor'.
- color_sensor.rgbi(port) -> (r, g, b, intensity), four ints
"""

_HUB_IO = """\
--- hub module ---
The hub module contains many submodules. Import what you need:
'from hub import port, motion_sensor, sound, button, light_matrix' (or '*').

--- hub.port submodule ---
Constants A..F corresponding to physical ports. Use as port.A, port.B, etc.

--- hub.motion_sensor submodule ---
Uses the SPIKE 3 IMU. 'from hub import motion_sensor'.
- motion_sensor.acceleration() -> (x, y, z), each in milli-G
- motion_sensor.set_yaw_face(up: int)
    up is one of motion_sensor.TOP / FRONT / RIGHT / BOTTOM / BACK / LEFT
- motion_sensor.reset_yaw(angle: int)
- motion_sensor.tilt_angles() -> (yaw, pitch, roll), decidegrees

--- hub.sound submodule ---
'from hub import sound'.
- sound.beep(frequency, duration, volume)   # Hz, ms, 1-100; non-blocking, awaitable
- sound.stop()

--- hub.button submodule ---
'from hub import button'. Constants: button.LEFT, button.RIGHT.
- button.pressed(button) -> bool

--- hub.light_matrix submodule ---
5x5 LED matrix on the hub front. 'from hub import light_matrix'.
- light_matrix.write("Hello, world!")             # scrolls text, ~500 ms/char
- light_matrix.show(pixels)                       # pixels: list of 25 ints, 0-100

--- color_matrix module (external 3x3 RGB matrix) ---
'import color_matrix'. Plugs into any port A-F.
- color_matrix.set_pixel(port.A, x, y, color.BLUE, intensity)
- color_matrix.show(port.A, [(color.BLUE, 10)] * 9)   # all 9 pixels blue, full intensity

--- color module ---
'import color'. Constants:
BLACK 0, MAGENTA 1, PURPLE 2, BLUE 3, AZURE 4, TURQUOISE 5, GREEN 6, YELLOW 7,
ORANGE 8, RED 9, WHITE 10, UNKNOWN -1.
"""

_RUNLOOP = """\
--- runloop module ---
'import runloop' (top-level — do NOT import from hub).
- runloop.run(fun1(), fun2(), ...)  # blocking, NOT awaitable; pass *called* coroutines
- runloop.sleep_ms(ms)              # awaitable; use as 'await runloop.sleep_ms(1000)'

Note: when calling runloop.run(), pass coroutines (function calls), not function refs.
'import time; time.sleep(5)' is in seconds, not milliseconds.

--- car driving note ---
A simple two-motor car drives forward by running one motor forward and the other
backward (mounted opposite). The motor_pair module handles this via 'move_tank'
or 'move' with steering=0.
"""

EXAMPLES = """\
EXAMPLES:

Prompt: "Skriv et program til mig, der smiler"
```python
from hub import light_matrix

# Dette saetter lysmatrixen til at vise billedet "smile"
light_matrix.show_image(light_matrix.IMAGE_SMILE)
```

---

Prompt: "write code to make a car with motors on ports a and b move forward for 10 seconds"
```python
import motor
from hub import port
import time

velocity = 600
duration_ms = 10000

motor.run(port.A, velocity)
motor.run(port.B, -velocity)

time.sleep_ms(duration_ms)

motor.stop(port.A)
motor.stop(port.B)
```

---

Prompt: "I have this error: OSError: [Errno 19] ENODEV. What do I do?"

Answer: ENODEV means the hardware device on that port wasn't found. Check that
the hub is powered/connected, that motors are physically plugged into the expected
ports, and that the hub recognises each port (test ports individually).

---

Prompt: "distance sensor on port C and motors on A/B; left motor when something close, right motor when nothing close"
```python
import motor
from hub import port
import distance_sensor
import time

LEFT_MOTOR = port.A
RIGHT_MOTOR = port.B
DISTANCE_PORT = port.C

CLOSE_THRESHOLD_MM = 250
LEFT_SPEED = 600
RIGHT_SPEED = 600

while True:
    distance_mm = distance_sensor.distance(DISTANCE_PORT)
    if distance_mm != -1 and distance_mm < CLOSE_THRESHOLD_MM:
        motor.run(LEFT_MOTOR, LEFT_SPEED)
        motor.stop(RIGHT_MOTOR)
    else:
        motor.stop(LEFT_MOTOR)
        motor.run(RIGHT_MOTOR, RIGHT_SPEED)
    time.sleep_ms(100)
```
"""

BUNDLES: dict[str, str] = {
    "motors": _MOTORS,
    "motor_pair": _MOTOR_PAIR,
    "sensors": _SENSORS,
    "hub_io": _HUB_IO,
    "runloop": _RUNLOOP,
}
