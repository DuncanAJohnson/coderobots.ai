"""
legoeducation.py — Pyodide wrapper around lego-education-ble.js

Student-facing Python API that matches the LEGO Education Python package
(`pip install legoeducation`) as closely as possible, but routes every call
through a synchronous RPC bridge to the main thread, where the JS BLE
library owns the device instances.

This module runs *inside a Web Worker*, so `window.LEGO_DEVICES` is not
reachable directly. Instead, every device method and property read turns
into a `js.LEGO_BRIDGE.rpc(json)` call which blocks the worker until the
main thread has executed the corresponding BLE call and written the
result into shared memory.

Usage:
    import legoeducation as le
    motor = le.SingleMotor()
    motor.connect()
    motor.motor_run(speed=50)
    time.sleep(1)
    motor.motor_stop()
    motor.disconnect()
"""

import json
from types import SimpleNamespace

import js  # Pyodide virtual module — resolves to the worker global scope.


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
# RPC bridge helpers
# ---------------------------------------------------------------------------

def _bridge():
    b = getattr(js, "LEGO_BRIDGE", None)
    if b is None:
        raise RuntimeError(
            "LEGO bridge ikke installeret. Pyodide-workeren er ikke sat "
            "op til LEGO Education tilstand."
        )
    return b


def _rpc(request):
    """Send a JSON request to the main thread and return the decoded value.

    Blocks the worker (via Atomics.wait on the bridge side) until the main
    thread has written the response. Raises RuntimeError on bridge errors.
    """
    resp_str = _bridge().rpc(json.dumps(request))
    resp = json.loads(resp_str)
    if not resp.get("ok"):
        raise RuntimeError(resp.get("error", "unknown bridge error"))
    return _wrap(resp.get("value"))


def _wrap(value):
    """Convert dict results into SimpleNamespace so student code can write
    `sensor.sensor.color` instead of `sensor.sensor["color"]`."""
    if isinstance(value, dict):
        return SimpleNamespace(**{k: _wrap(v) for k, v in value.items()})
    if isinstance(value, list):
        return [_wrap(v) for v in value]
    return value


def _clean(opts):
    return {k: v for k, v in opts.items() if v is not None}


def _call(slot, method, positional=None, id=None, **opts):
    return _rpc({
        "kind": "call",
        "slot": slot,
        "id": id,
        "method": method,
        "positional": list(positional) if positional else [],
        "opts": _clean(opts),
    })


def _get(slot, *path, id=None):
    return _rpc({"kind": "get", "slot": slot, "id": id, "path": list(path)})


def _has(slot, id=None):
    return bool(_rpc({"kind": "has", "slot": slot, "id": id}))


# ---------------------------------------------------------------------------
# Base device
# ---------------------------------------------------------------------------

class _LegoDeviceBase:
    _slot_name = ""  # overridden by subclasses

    def __init__(self, id=None):
        # `id` is the user-assigned string shown in the UI next to the
        # "Connect Hardware" button. With multiple devices of the same type
        # connected, pass id='left' / id='right' / etc. to address a
        # specific one. Leave as None to use the first connected device of
        # this type.
        self._id = id
        self._attached = False

    # -- connection -------------------------------------------------------

    def connect(self, card_color=None, card_serial=None):
        """Attach this Python object to a JS device instance that was
        already connected via the UI's "Connect Hardware" button.

        `card_color` / `card_serial` are accepted for API compatibility with
        the local LEGO Education Python package but are currently ignored —
        the browser connection flow already picked the device.
        """
        if not _has(self._slot_name, id=self._id):
            suffix = f" med id='{self._id}'" if self._id is not None else ""
            raise RuntimeError(
                f"Enheden '{self._slot_name}'{suffix} er ikke forbundet. "
                f"Klik 'Connect Hardware' i UI'et først."
            )
        self._attached = True
        return True

    def disconnect(self):
        # We deliberately DO NOT close the browser BT connection here —
        # the UI owns the lifecycle so the same device can be reused by
        # the next script run without re-prompting.
        self._attached = False

    @property
    def connected(self):
        return self._attached and _has(self._slot_name, id=self._id)

    def _require(self):
        if not self._attached:
            raise RuntimeError(
                "Enheden er ikke forbundet. Kald .connect() først."
            )

    # -- common commands (light, sound) ----------------------------------

    def light_color(self, color, pattern=None, intensity=None):
        self._require()
        return _call(
            self._slot_name, "light_color", id=self._id,
            positional=[color],
            pattern=pattern, intensity=intensity, blocking=False,
        )

    def beep(self, pattern=None, frequency=None, count=None):
        self._require()
        return _call(
            self._slot_name, "beep", id=self._id,
            positional=[pattern if pattern is not None else SOUND_PATTERN_BEEP_SINGLE],
            frequency=frequency, count=count, blocking=False,
        )

    def stop_beep(self):
        self._require()
        return _call(self._slot_name, "stop_beep", id=self._id, blocking=False)

    # -- live data passthroughs ------------------------------------------

    @property
    def info_device(self):
        if not self._attached:
            return None
        return _get(self._slot_name, "info_device", id=self._id)

    @property
    def scanned_card(self):
        if not self._attached:
            return None
        return _get(self._slot_name, "scanned_card", id=self._id)

    @property
    def button(self):
        if not self._attached:
            return None
        return _get(self._slot_name, "button", id=self._id)


# ---------------------------------------------------------------------------
# SingleMotor
# ---------------------------------------------------------------------------

class SingleMotor(_LegoDeviceBase):
    _slot_name = "singlemotor"

    @property
    def motor(self):
        """Live motor state snapshot: position, speed, motorState, etc."""
        if not self._attached:
            return None
        return _get(self._slot_name, "motor", id=self._id)

    def motor_run(self, speed=None, direction=None):
        self._require()
        return _call(
            self._slot_name, "motor_run", id=self._id,
            speed=speed, direction=direction, blocking=False,
        )

    def motor_run_for_degrees(self, degrees, speed=None, direction=None):
        self._require()
        return _call(
            self._slot_name, "motor_run_for_degrees", id=self._id,
            positional=[degrees],
            speed=speed, direction=direction, blocking=False,
        )

    def motor_run_for_time(self, time_ms, speed=None, direction=None):
        self._require()
        return _call(
            self._slot_name, "motor_run_for_time", id=self._id,
            positional=[time_ms],
            speed=speed, direction=direction, blocking=False,
        )

    def motor_run_to_absolute_position(self, position, speed=None, direction=None):
        self._require()
        return _call(
            self._slot_name, "motor_run_to_absolute_position", id=self._id,
            positional=[position],
            speed=speed, direction=direction, blocking=False,
        )

    def motor_run_to_relative_position(self, position, speed=None):
        self._require()
        return _call(
            self._slot_name, "motor_run_to_relative_position", id=self._id,
            positional=[position],
            speed=speed, blocking=False,
        )

    def motor_stop(self):
        self._require()
        return _call(self._slot_name, "motor_stop", id=self._id, blocking=False)

    def motor_set_speed(self, speed):
        self._require()
        return _call(
            self._slot_name, "motor_set_speed", id=self._id,
            positional=[speed], blocking=False,
        )

    def motor_reset_relative_position(self, position=0):
        self._require()
        return _call(
            self._slot_name, "motor_reset_relative_position", id=self._id,
            position=position, blocking=False,
        )


# ---------------------------------------------------------------------------
# DoubleMotor
# ---------------------------------------------------------------------------

class DoubleMotor(_LegoDeviceBase):
    _slot_name = "doublemotor"

    # --- motor state snapshots (left/right) ---

    @property
    def motor(self):
        """List-like of two motor notifications: motor[0]=left, motor[1]=right."""
        if not self._attached:
            return None
        return _get(self._slot_name, "motor", id=self._id)

    @property
    def imu_device(self):
        if not self._attached:
            return None
        return _get(self._slot_name, "imu_device", id=self._id)

    @property
    def imu_gesture(self):
        if not self._attached:
            return None
        return _get(self._slot_name, "imu_gesture", id=self._id)

    # --- individual motor commands (with motor= kwarg) ---

    def motor_run(self, speed=None, direction=None, motor=None):
        self._require()
        return _call(
            self._slot_name, "motor_run", id=self._id,
            speed=speed, direction=direction, motor=motor, blocking=False,
        )

    def motor_run_for_degrees(self, degrees, speed=None, direction=None, motor=None):
        self._require()
        return _call(
            self._slot_name, "motor_run_for_degrees", id=self._id,
            positional=[degrees],
            speed=speed, direction=direction, motor=motor, blocking=False,
        )

    def motor_run_for_time(self, time_ms, speed=None, direction=None, motor=None):
        self._require()
        return _call(
            self._slot_name, "motor_run_for_time", id=self._id,
            positional=[time_ms],
            speed=speed, direction=direction, motor=motor, blocking=False,
        )

    def motor_stop(self, motor=None):
        self._require()
        return _call(
            self._slot_name, "motor_stop", id=self._id,
            motor=motor, blocking=False,
        )

    # --- coordinated movement commands ---

    def movement_move(self, direction=None, speed=None):
        self._require()
        return _call(
            self._slot_name, "movement_move", id=self._id,
            direction=direction, speed=speed, blocking=False,
        )

    def movement_move_for_time(self, time_ms, direction=None, speed=None):
        self._require()
        return _call(
            self._slot_name, "movement_move_for_time", id=self._id,
            positional=[time_ms],
            direction=direction, speed=speed, blocking=False,
        )

    def movement_move_for_degrees(self, degrees, direction=None, speed=None):
        self._require()
        return _call(
            self._slot_name, "movement_move_for_degrees", id=self._id,
            positional=[degrees],
            direction=direction, speed=speed, blocking=False,
        )

    def movement_move_tank(self, speed_left, speed_right):
        self._require()
        return _call(
            self._slot_name, "movement_move_tank", id=self._id,
            positional=[speed_left, speed_right],
            blocking=False,
        )

    def movement_turn_for_degrees(self, degrees, direction=None, speed=None):
        self._require()
        return _call(
            self._slot_name, "movement_turn_for_degrees", id=self._id,
            positional=[degrees],
            direction=direction, speed=speed, blocking=False,
        )

    def movement_stop(self):
        self._require()
        return _call(self._slot_name, "movement_stop", id=self._id, blocking=False)

    def movement_set_speed(self, speed):
        self._require()
        return _call(
            self._slot_name, "movement_set_speed", id=self._id,
            positional=[speed], blocking=False,
        )


# ---------------------------------------------------------------------------
# ColorSensor
# ---------------------------------------------------------------------------

class ColorSensor(_LegoDeviceBase):
    _slot_name = "colorsensor"

    @property
    def sensor(self):
        """Live sensor state: color, reflection, rawRed/Green/Blue, hue, etc."""
        if not self._attached:
            return None
        return _get(self._slot_name, "sensor", id=self._id)


# ---------------------------------------------------------------------------
# Controller
# ---------------------------------------------------------------------------

class Controller(_LegoDeviceBase):
    _slot_name = "controller"

    @property
    def sensor(self):
        """Live lever state: leftPercent, rightPercent, leftAngle, rightAngle."""
        if not self._attached:
            return None
        return _get(self._slot_name, "sensor", id=self._id)
