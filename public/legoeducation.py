"""
legoeducation.py — Pyodide wrapper around lego-education-ble.js

Student-facing Python API that matches the LEGO Education Python package
(`pip install legoeducation`) as closely as possible, but routes every call
through the browser JS library (window.legoeducation) and devices that were
already connected via the UI (window.LEGO_DEVICES).

Usage:
    import legoeducation as le
    motor = le.SingleMotor()
    motor.connect()
    motor.motor_run(speed=50)
    time.sleep(1)
    motor.motor_stop()
    motor.disconnect()
"""

import js
from pyodide.ffi import to_js
from js import Object


# ---------------------------------------------------------------------------
# Constants (mirrored from lego-education-ble.js so students can reference
# le.LEGO_COLOR_RED etc. without reaching into the JS namespace).
# ---------------------------------------------------------------------------

LEGO_COLOR_NOCOLOR = 0
LEGO_COLOR_RED = 1
LEGO_COLOR_YELLOW = 2
LEGO_COLOR_BLUE = 3
LEGO_COLOR_TEAL = 4
LEGO_COLOR_GREEN = 5
LEGO_COLOR_PURPLE = 6
LEGO_COLOR_WHITE = 7
LEGO_COLOR_MAGENTA = 8
LEGO_COLOR_ORANGE = 9
LEGO_COLOR_AZURE = 10

MOTOR_MOVE_DIRECTION_CLOCKWISE = 0
MOTOR_MOVE_DIRECTION_COUNTERCLOCKWISE = 1
MOTOR_MOVE_DIRECTION_SHORTEST = 2
MOTOR_MOVE_DIRECTION_LONGEST = 3

MOVEMENT_DIRECTION_FORWARD = 0
MOVEMENT_DIRECTION_BACKWARD = 1
MOVEMENT_DIRECTION_LEFT = 2
MOVEMENT_DIRECTION_RIGHT = 3

MOVEMENT_TURN_DIRECTION_LEFT = 2
MOVEMENT_TURN_DIRECTION_RIGHT = 3

MOTOR_LEFT = 0
MOTOR_RIGHT = 1
MOTOR_BOTH = 2

MOTOR_END_STATE_COAST = 0
MOTOR_END_STATE_BRAKE = 1
MOTOR_END_STATE_HOLD = 2

LIGHT_PATTERN_SOLID = 0
LIGHT_PATTERN_BREATHE = 1
LIGHT_PATTERN_PULSE = 2
LIGHT_PATTERN_SHORT_BLINK = 3
LIGHT_PATTERN_LONG_BLINK = 4
LIGHT_PATTERN_DOUBLE_BLINK = 5

SOUND_PATTERN_BEEP_SINGLE = 0
SOUND_PATTERN_BEEP_DOUBLE = 1
SOUND_PATTERN_BEEP_TRIPLE = 2
SOUND_PATTERN_BEEP_UP_MIDDLE_DOWN = 3

BUTTON_STATE_RELEASED = 0
BUTTON_STATE_PRESSED = 1


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _opts(**kwargs):
    """Build a JS options object from kwargs, dropping None values.

    Pyodide's FFI needs an actual JS object (not a Python dict) for the
    destructured `options = {}` parameters on the JS side.
    """
    clean = {k: v for k, v in kwargs.items() if v is not None}
    return to_js(clean, dict_converter=Object.fromEntries)


def _get_slot(name):
    devices = getattr(js.window, "LEGO_DEVICES", None)
    if devices is None:
        raise RuntimeError(
            "window.LEGO_DEVICES ikke initialiseret. "
            "Brug forbindelsesknapperne i UI'et først."
        )
    return getattr(devices, name, None)


# ---------------------------------------------------------------------------
# Base device
# ---------------------------------------------------------------------------

class _LegoDeviceBase:
    _slot_name = ""  # overridden by subclasses

    def __init__(self):
        self._js = None

    # -- connection -------------------------------------------------------

    def connect(self, card_color=None, card_serial=None):
        """Attach this Python object to the JS device instance that was
        already connected via the UI's 'Forbind …' button.

        `card_color` / `card_serial` are accepted for API compatibility with
        the local LEGO Education Python package but are currently ignored —
        the browser connection flow already picked the device.
        """
        slot = _get_slot(self._slot_name)
        if slot is None:
            raise RuntimeError(
                f"Enheden '{self._slot_name}' er ikke forbundet. "
                f"Klik 'Forbind' i UI'et først."
            )
        self._js = slot
        return True

    def disconnect(self):
        # We deliberately DO NOT close the browser BT connection here —
        # the UI owns the lifecycle so the same device can be reused by
        # the next script run without re-prompting.
        self._js = None

    @property
    def connected(self):
        return self._js is not None and bool(self._js.connected)

    # -- common commands (light, sound) ----------------------------------

    def _require(self):
        if self._js is None:
            raise RuntimeError(
                "Enheden er ikke forbundet. Kald .connect() først."
            )
        return self._js

    def light_color(self, color, pattern=None, intensity=None):
        dev = self._require()
        return dev.light_color(color, _opts(pattern=pattern, intensity=intensity, blocking=False))

    def beep(self, pattern=None, frequency=None, count=None):
        dev = self._require()
        return dev.beep(
            pattern if pattern is not None else SOUND_PATTERN_BEEP_SINGLE,
            _opts(frequency=frequency, count=count, blocking=False),
        )

    def stop_beep(self):
        dev = self._require()
        return dev.stop_beep(_opts(blocking=False))

    # -- live data passthroughs ------------------------------------------

    @property
    def info_device(self):
        return self._js.info_device if self._js is not None else None

    @property
    def scanned_card(self):
        return self._js.scanned_card if self._js is not None else None

    @property
    def button(self):
        return self._js.button if self._js is not None else None


# ---------------------------------------------------------------------------
# SingleMotor
# ---------------------------------------------------------------------------

class SingleMotor(_LegoDeviceBase):
    _slot_name = "singlemotor"

    @property
    def motor(self):
        """Live motor state: position, speed, motorState, etc."""
        return self._js.motor if self._js is not None else None

    def motor_run(self, speed=None, direction=None):
        dev = self._require()
        return dev.motor_run(_opts(speed=speed, direction=direction, blocking=False))

    def motor_run_for_degrees(self, degrees, speed=None, direction=None):
        dev = self._require()
        return dev.motor_run_for_degrees(
            degrees,
            _opts(speed=speed, direction=direction, blocking=False),
        )

    def motor_run_for_time(self, time_ms, speed=None, direction=None):
        dev = self._require()
        return dev.motor_run_for_time(
            time_ms,
            _opts(speed=speed, direction=direction, blocking=False),
        )

    def motor_run_to_absolute_position(self, position, speed=None, direction=None):
        dev = self._require()
        return dev.motor_run_to_absolute_position(
            position,
            _opts(speed=speed, direction=direction, blocking=False),
        )

    def motor_run_to_relative_position(self, position, speed=None):
        dev = self._require()
        return dev.motor_run_to_relative_position(
            position,
            _opts(speed=speed, blocking=False),
        )

    def motor_stop(self):
        dev = self._require()
        return dev.motor_stop(_opts(blocking=False))

    def motor_set_speed(self, speed):
        dev = self._require()
        return dev.motor_set_speed(speed, _opts(blocking=False))

    def motor_reset_relative_position(self, position=0):
        dev = self._require()
        return dev.motor_reset_relative_position(
            _opts(position=position, blocking=False),
        )


# ---------------------------------------------------------------------------
# DoubleMotor
# ---------------------------------------------------------------------------

class DoubleMotor(_LegoDeviceBase):
    _slot_name = "doublemotor"

    # --- motor state arrays (left/right) ---

    @property
    def motor(self):
        """Array-like of two motor notifications: motor[0]=left, motor[1]=right."""
        return self._js.motor if self._js is not None else None

    @property
    def imu_device(self):
        return self._js.imu_device if self._js is not None else None

    @property
    def imu_gesture(self):
        return self._js.imu_gesture if self._js is not None else None

    # --- individual motor commands (with motor= kwarg) ---

    def motor_run(self, speed=None, direction=None, motor=None):
        dev = self._require()
        return dev.motor_run(
            _opts(speed=speed, direction=direction, motor=motor, blocking=False),
        )

    def motor_run_for_degrees(self, degrees, speed=None, direction=None, motor=None):
        dev = self._require()
        return dev.motor_run_for_degrees(
            degrees,
            _opts(speed=speed, direction=direction, motor=motor, blocking=False),
        )

    def motor_run_for_time(self, time_ms, speed=None, direction=None, motor=None):
        dev = self._require()
        return dev.motor_run_for_time(
            time_ms,
            _opts(speed=speed, direction=direction, motor=motor, blocking=False),
        )

    def motor_stop(self, motor=None):
        dev = self._require()
        return dev.motor_stop(_opts(motor=motor, blocking=False))

    # --- coordinated movement commands ---

    def movement_move(self, direction=None, speed=None):
        dev = self._require()
        return dev.movement_move(
            _opts(direction=direction, speed=speed, blocking=False),
        )

    def movement_move_for_time(self, time_ms, direction=None, speed=None):
        dev = self._require()
        return dev.movement_move_for_time(
            time_ms,
            _opts(direction=direction, speed=speed, blocking=False),
        )

    def movement_move_for_degrees(self, degrees, direction=None, speed=None):
        dev = self._require()
        return dev.movement_move_for_degrees(
            degrees,
            _opts(direction=direction, speed=speed, blocking=False),
        )

    def movement_move_tank(self, speed_left, speed_right):
        dev = self._require()
        return dev.movement_move_tank(speed_left, speed_right, _opts(blocking=False))

    def movement_turn_for_degrees(self, degrees, direction=None, speed=None):
        dev = self._require()
        return dev.movement_turn_for_degrees(
            degrees,
            _opts(direction=direction, speed=speed, blocking=False),
        )

    def movement_stop(self):
        dev = self._require()
        return dev.movement_stop(_opts(blocking=False))

    def movement_set_speed(self, speed):
        dev = self._require()
        return dev.movement_set_speed(speed, _opts(blocking=False))


# ---------------------------------------------------------------------------
# ColorSensor
# ---------------------------------------------------------------------------

class ColorSensor(_LegoDeviceBase):
    _slot_name = "colorsensor"

    @property
    def sensor(self):
        """Live sensor state: color, reflection, rawRed/Green/Blue, hue, etc."""
        return self._js.sensor if self._js is not None else None


# ---------------------------------------------------------------------------
# Controller
# ---------------------------------------------------------------------------

class Controller(_LegoDeviceBase):
    _slot_name = "controller"

    @property
    def sensor(self):
        """Live lever state: leftPercent, rightPercent, leftAngle, rightAngle."""
        return self._js.sensor if self._js is not None else None
