# LEGO Education Web Bluetooth JavaScript Framework

## Overview

`lego-education-ble.js` is a client-side JavaScript library that communicates with LEGO Education hardware over Bluetooth Low Energy (BLE) from a web browser. It uses the Web Bluetooth API and implements the full LEGO Education RPC binary protocol.

The API uses snake_case naming to match the official LEGO Education Python library, so the same documentation and examples apply to both languages.

**Supported hardware:** Single Motor, Double Motor, Color Sensor, Controller.

**Browser requirements:** Chrome or Edge with Bluetooth enabled. Must be served over HTTPS or localhost. The `connect()` call must originate from a user gesture (e.g., a button click).

## Setup

Include the script in your HTML. It exposes a global `legoeducation` object:

```html
<script src="lego-education-ble.js"></script>
<script>
  const le = legoeducation;
</script>
```

All device classes, constants, and helpers are accessed through `le`.

## Architecture

The library has three layers:

1. **Constants and Enums** -- All LEGO protocol constants (directions, colors, motor states, gestures, etc.) are available as `le.CONSTANT_NAME`.
2. **RPC Protocol** -- Handles binary message serialization (commands) and deserialization (responses/notifications) using little-endian `DataView` operations, matching the firmware's wire format exactly.
3. **Device Classes** -- `SingleMotor`, `DoubleMotor`, `ColorSensor`, and `Controller` each manage a BLE connection, send commands, receive responses, and auto-update live sensor/motor state from streaming notifications.

### How Communication Works

Each device connects to a BLE GATT service and uses two characteristics: one for writing commands (TX) and one for receiving notifications (RX). The device streams notification packets at a configurable interval (default 100ms) containing live sensor data. Commands are request/response pairs: you send a command and `await` the device's acknowledgment.

All command methods are `async` and return a Promise. Pass `blocking: false` in the options to fire-and-forget (don't wait for acknowledgment).

---

## Devices

### Single Motor

```js
const singlemotor = new le.SingleMotor();
```

A single LEGO Education motor with position tracking, speed control, and rotation commands.

#### Connecting

```js
// Must be called inside a user gesture (e.g., button onclick)
document.getElementById('connectBtn').addEventListener('click', async () => {
  const info = await singlemotor.connect();
  console.log('Connected!', info.firmwareVersion);
});
```

#### Live Data (auto-updated from notifications)

```js
singlemotor.motor.position          // int32 - Relative position in degrees
singlemotor.motor.absolutePosition  // uint16 - Absolute position (0-359)
singlemotor.motor.speed             // int8 - Current speed (-100 to 100)
singlemotor.motor.power             // int16 - Current power
singlemotor.motor.motorState        // uint8 - Motor state (see Motor State constants)
singlemotor.motor.gesture           // int8 - Motor gesture (see Motor Gesture constants)
singlemotor.motor.motorBitMask      // uint8 - Which motor (bitmask)

singlemotor.info_device.batteryLevel  // uint8 - Battery percentage (0-100)
singlemotor.info_device.usbPowerState // uint8 - 0=not connected, 1=connected

singlemotor.button.state              // uint8 - 0=released, 1=pressed
singlemotor.scanned_card.color        // int - App-aligned color constant
singlemotor.scanned_card.serial       // uint16 - Card serial number
```

#### Motor Commands

All motor commands accept an `options` object. The `motor` option is always `0` for SingleMotor (you can omit it).

```js
// Run continuously in a direction
await singlemotor.motor_run({ direction: le.MOTOR_MOVE_DIRECTION_CLOCKWISE, speed: 50 });
await singlemotor.motor_run({ direction: le.MOTOR_MOVE_DIRECTION_COUNTERCLOCKWISE, speed: 75 });

// Run for a specific number of degrees
await singlemotor.motor_run_for_degrees(360, { direction: le.MOTOR_MOVE_DIRECTION_CLOCKWISE, speed: 50 });

// Run for a duration (milliseconds)
await singlemotor.motor_run_for_time(2000, { direction: le.MOTOR_MOVE_DIRECTION_CLOCKWISE, speed: 50 });

// Run to an absolute position (0-359 degrees)
await singlemotor.motor_run_to_absolute_position(180, { direction: le.MOTOR_MOVE_DIRECTION_SHORTEST, speed: 50 });

// Run to a relative position (degrees offset from current relative position)
await singlemotor.motor_run_to_relative_position(500, { speed: 50 });

// Stop the motor (uses current end state)
await singlemotor.motor_stop();

// Set speed for subsequent commands (without starting movement)
await singlemotor.motor_set_speed(75);

// Reset relative position counter
await singlemotor.motor_reset_relative_position({ position: 0 });

// Set raw duty cycle (-10000 to 10000)
await singlemotor.motor_set_duty_cycle(5000);

// Set what happens when motor commands finish
await singlemotor.motor_set_end_state(le.MOTOR_END_STATE_BRAKE);

// Set acceleration and deceleration rates (0-100 each)
await singlemotor.motor_set_acceleration(50, 50);
```

---

### Double Motor

```js
const doublemotor = new le.DoubleMotor();
```

A dual-motor unit with left/right motor control, movement commands (forward/backward/turn), and a built-in IMU (accelerometer + gyroscope).

The DoubleMotor inherits all SingleMotor commands and adds movement commands and IMU controls. For individual motor commands, use the `motor` option to target `le.MOTOR_LEFT` (0), `le.MOTOR_RIGHT` (1), or `le.MOTOR_BOTH` (2, default).

#### Connecting

```js
document.getElementById('connectBtn').addEventListener('click', async () => {
  const info = await doublemotor.connect();
  console.log('Connected!', info.firmwareVersion);
});
```

#### Live Data

```js
// Motor data (array of two motors)
doublemotor.motor[0].position    // Left motor relative position
doublemotor.motor[0].speed       // Left motor speed
doublemotor.motor[0].motorState  // Left motor state
doublemotor.motor[1].position    // Right motor relative position
doublemotor.motor[1].speed       // Right motor speed
doublemotor.motor[1].motorState  // Right motor state
// Each motor[n] also has: absolutePosition, power, gesture, motorBitMask

// IMU data
doublemotor.imu_device.yaw            // int16 - Yaw angle
doublemotor.imu_device.pitch          // int16 - Pitch angle
doublemotor.imu_device.roll           // int16 - Roll angle
doublemotor.imu_device.orientation    // uint8 - Current face orientation
doublemotor.imu_device.yawFace        // uint8 - Which face is yaw reference
doublemotor.imu_device.accelerometerX // int16
doublemotor.imu_device.accelerometerY // int16
doublemotor.imu_device.accelerometerZ // int16
doublemotor.imu_device.gyroscopeX     // int16
doublemotor.imu_device.gyroscopeY     // int16
doublemotor.imu_device.gyroscopeZ     // int16

// IMU gesture
doublemotor.imu_gesture.gesture  // int8 - See Motion Gesture constants

// Battery, button, card -- same as SingleMotor
doublemotor.info_device.batteryLevel
doublemotor.button.state
doublemotor.scanned_card.color
```

#### Individual Motor Commands (inherited from SingleMotor)

Target specific motors with the `motor` option:

```js
// Run just the left motor
await doublemotor.motor_run({ motor: le.MOTOR_LEFT, direction: le.MOTOR_MOVE_DIRECTION_CLOCKWISE, speed: 50 });

// Run just the right motor for 360 degrees
await doublemotor.motor_run_for_degrees(360, { motor: le.MOTOR_RIGHT, speed: 50 });

// Stop both motors
await doublemotor.motor_stop({ motor: le.MOTOR_BOTH });

// Set speed for both motors
await doublemotor.motor_set_speed(60, { motor: le.MOTOR_BOTH });

// Reset both motor positions
await doublemotor.motor_reset_relative_position({ motor: le.MOTOR_BOTH, position: 0 });
```

#### Movement Commands (DoubleMotor only)

Movement commands coordinate both motors together for driving/turning:

```js
// Drive in a direction (starts moving, does not stop on its own)
await doublemotor.movement_move({ direction: le.MOVEMENT_DIRECTION_FORWARD, speed: 50 });
await doublemotor.movement_move({ direction: le.MOVEMENT_DIRECTION_BACKWARD, speed: 50 });

// Drive for a duration (ms), then stop
await doublemotor.movement_move_for_time(2000, { direction: le.MOVEMENT_DIRECTION_FORWARD, speed: 50 });

// Drive for a number of motor rotation degrees, then stop
await doublemotor.movement_move_for_degrees(360, { direction: le.MOVEMENT_MOVE_DIRECTION_FORWARD, speed: 50 });

// Tank drive: independent speed for left and right (-100 to 100 each)
await doublemotor.movement_move_tank(30, 60);  // gentle right curve
await doublemotor.movement_move_tank(-50, 50); // spin in place

// Tank drive for degrees: run until one motor reaches the specified degrees
await doublemotor.movement_move_tank_for_degrees(360, { speed_left: 50, speed_right: 50 });

// Turn in place using the IMU (degrees of rotation, not motor degrees)
await doublemotor.movement_turn_for_degrees(90, { direction: le.MOVEMENT_TURN_DIRECTION_LEFT, speed: 40 });
await doublemotor.movement_turn_for_degrees(90, { direction: le.MOVEMENT_TURN_DIRECTION_RIGHT, speed: 40 });

// Stop all movement
await doublemotor.movement_stop();

// Configure movement parameters
await doublemotor.movement_set_speed(50);                          // default speed for movement commands
await doublemotor.movement_set_end_state(le.MOTOR_END_STATE_BRAKE); // what happens when movement stops
await doublemotor.movement_set_acceleration(50, 50);               // accel/decel rates (0-100)
await doublemotor.movement_set_turn_steering(50);                  // turn sharpness (0-100)
```

#### IMU Commands (DoubleMotor only)

```js
// Set which physical face of the device is used for yaw measurement
await doublemotor.imu_set_yaw_face(le.DEVICE_FACE_TOP);

// Reset the yaw reading to a specific value (default 0)
await doublemotor.imu_reset_yaw_axis(0);
```

---

### Color Sensor

```js
const colorsensor = new le.ColorSensor();
```

Reads color, reflection, raw RGB, and HSV values from the LEGO Color Sensor.

#### Connecting

```js
document.getElementById('connectBtn').addEventListener('click', async () => {
  const info = await colorsensor.connect();
  console.log('Connected!', info.firmwareVersion);
});
```

#### Live Data

```js
colorsensor.sensor.color       // int - App-aligned color constant (see Color Constants below)
colorsensor.sensor.reflection  // uint8 - Reflection value
colorsensor.sensor.rawRed      // uint16 - Raw red channel
colorsensor.sensor.rawGreen    // uint16 - Raw green channel
colorsensor.sensor.rawBlue     // uint16 - Raw blue channel
colorsensor.sensor.hue         // uint16 - Hue (0-360)
colorsensor.sensor.saturation  // uint8 - Saturation (0-100)
colorsensor.sensor.value       // uint8 - Value/brightness (0-100)

// Battery, button, card -- same as all devices
colorsensor.info_device.batteryLevel
colorsensor.button.state
colorsensor.scanned_card.color
```

#### Detecting Colors

The `sensor.color` property returns an app-aligned color constant. Compare it to `le.LEGO_COLOR_*` constants:

```js
setInterval(() => {
  const c = colorsensor.sensor.color;
  if (c === le.LEGO_COLOR_RED)    console.log('Seeing red!');
  if (c === le.LEGO_COLOR_BLUE)   console.log('Seeing blue!');
  if (c === le.LEGO_COLOR_NOCOLOR) console.log('No color detected');

  // Get the color name string
  const name = le.LEGO_COLOR_NAME_MAP[c]; // e.g., "LEGO_COLOR_RED"

  // Get a CSS hex value for display
  const hex = le.LEGO_COLOR_HEX_MAP[c];   // e.g., "#de1a21"
}, 100);
```

---

### Controller

```js
const controller = new le.Controller();
```

Reads the two lever positions from the LEGO Controller.

#### Connecting

```js
document.getElementById('connectBtn').addEventListener('click', async () => {
  const info = await controller.connect();
  console.log('Connected!', info.firmwareVersion);
});
```

#### Live Data

```js
controller.sensor.leftPercent   // int8 - Left lever position (-100 to 100)
controller.sensor.rightPercent  // int8 - Right lever position (-100 to 100)
controller.sensor.leftAngle    // int16 - Left lever angle
controller.sensor.rightAngle   // int16 - Right lever angle

// Battery, button, card -- same as all devices
controller.info_device.batteryLevel
controller.button.state
controller.scanned_card.color
```

#### Driving a Double Motor with the Controller

```js
// Poll the controller and send tank commands to the double motor
setInterval(async () => {
  if (controller.connected && doublemotor.connected) {
    await doublemotor.movement_move_tank(
      controller.sensor.leftPercent,
      controller.sensor.rightPercent
    );
  }
}, 100);
```

---

## Commands Available on All Devices

Every device (SingleMotor, DoubleMotor, ColorSensor, Controller) inherits these common commands:

```js
// Connect (must be in a user gesture handler)
const info = await device.connect();
// info = { firmwareVersion, rpcVersion, maxPacketSize, productGroupDevice, ... }

// Disconnect
await device.disconnect();

// Get device info
const info = await device.info();

// Get device UUID
const uuid = await device.device_uuid();

// Set the LED light color
await device.light_color(le.LEGO_COLOR_RED);
await device.light_color(le.LEGO_COLOR_BLUE, { pattern: le.LIGHT_PATTERN_BREATHE, intensity: 80 });

// Play a beep
await device.play_beep();
await device.play_beep({ pattern: le.SOUND_PATTERN_BEEP_DOUBLE, frequency: 880, repetitions: 3 });

// Stop sound
await device.stop_sound();

// Check connection status
if (device.connected) { /* ... */ }

// Set a callback for raw notification data
device.set_notification_callback((notifications) => {
  for (const item of notifications) {
    console.log(item.type, item);
  }
});

// Enable debug logging to console
device.set_debug(true);
```

---

## Notification Callback

The notification callback receives an array of parsed notification objects on each notification cycle (default every 100ms). Each object has a `type` string property:

```js
singlemotor.set_notification_callback((notifications) => {
  for (const item of notifications) {
    switch (item.type) {
      case 'MotorNotification':
        console.log('Position:', item.position, 'Speed:', item.speed);
        break;
      case 'InfoDeviceNotification':
        console.log('Battery:', item.batteryLevel);
        break;
      case 'ButtonStateNotification':
        console.log('Button:', item.state === le.BUTTON_STATE_PRESSED ? 'pressed' : 'released');
        break;
      case 'CardNotification':
        console.log('Card color:', item.color, 'Serial:', item.serial);
        break;
      case 'ImuDeviceNotification':       // DoubleMotor only
        console.log('Yaw:', item.yaw, 'Pitch:', item.pitch, 'Roll:', item.roll);
        break;
      case 'ImuGestureNotification':      // DoubleMotor only
        console.log('Gesture:', item.gesture);
        break;
      case 'ColorSensorNotification':     // ColorSensor only
        console.log('Color:', item.color, 'RGB:', item.rawRed, item.rawGreen, item.rawBlue);
        break;
      case 'ControllerNotification':      // Controller only
        console.log('Left:', item.leftPercent, 'Right:', item.rightPercent);
        break;
    }
  }
});
```

---

## Disconnect Handling

```js
// Set a callback that fires when the device disconnects unexpectedly
singlemotor._onDisconnect = () => {
  console.log('Connection lost!');
  // Update UI, attempt reconnect, etc.
};

// Check connection state at any time
if (!singlemotor.connected) {
  console.log('Not connected');
}
```

---

## Constants Reference

### Color Constants (App-Aligned)

Used with `light_color()` and returned by `sensor.color` / `scanned_card.color`:

| Constant | Value | Hex |
|---|---|---|
| `le.LEGO_COLOR_NOCOLOR` | 0 | -- |
| `le.LEGO_COLOR_RED` | 1 | #de1a21 |
| `le.LEGO_COLOR_YELLOW` | 2 | #ffd400 |
| `le.LEGO_COLOR_BLUE` | 3 | #006cb8 |
| `le.LEGO_COLOR_TEAL` | 4 | -- |
| `le.LEGO_COLOR_GREEN` | 5 | #61a836 |
| `le.LEGO_COLOR_PURPLE` | 6 | #4b2f91 |
| `le.LEGO_COLOR_WHITE` | 7 | -- |
| `le.LEGO_COLOR_MAGENTA` | 8 | #e4599e |
| `le.LEGO_COLOR_ORANGE` | 9 | #f57d20 |
| `le.LEGO_COLOR_AZURE` | 10 | #78bfea |

Helper objects:
- `le.LEGO_COLOR_NAME_MAP[colorValue]` returns the string name (e.g., `"LEGO_COLOR_RED"`)
- `le.LEGO_COLOR_HEX_MAP[colorValue]` returns the CSS hex string (e.g., `"#de1a21"`)
- `le.SENSOR_DETECTABLE_COLORS` is a Set of colors the color sensor can detect
- `le.CARD_COLORS` is a Set of colors available on connection cards

### Motor Direction Constants

For `motor_run`, `motor_run_for_degrees`, `motor_run_for_time`:

| Constant | Value |
|---|---|
| `le.MOTOR_MOVE_DIRECTION_CLOCKWISE` | 0 |
| `le.MOTOR_MOVE_DIRECTION_COUNTERCLOCKWISE` | 1 |

For `motor_run_to_absolute_position`:

| Constant | Value |
|---|---|
| `le.MOTOR_MOVE_DIRECTION_SHORTEST` | 2 |
| `le.MOTOR_MOVE_DIRECTION_LONGEST` | 3 |

### Movement Direction Constants (DoubleMotor)

For `movement_move` and `movement_move_for_time`:

| Constant | Value |
|---|---|
| `le.MOVEMENT_DIRECTION_FORWARD` | 0 |
| `le.MOVEMENT_DIRECTION_BACKWARD` | 1 |
| `le.MOVEMENT_DIRECTION_LEFT` | 2 |
| `le.MOVEMENT_DIRECTION_RIGHT` | 3 |

For `movement_move_for_degrees`:

| Constant | Value |
|---|---|
| `le.MOVEMENT_MOVE_DIRECTION_FORWARD` | 0 |
| `le.MOVEMENT_MOVE_DIRECTION_BACKWARD` | 1 |

For `movement_turn_for_degrees`:

| Constant | Value |
|---|---|
| `le.MOVEMENT_TURN_DIRECTION_LEFT` | 2 |
| `le.MOVEMENT_TURN_DIRECTION_RIGHT` | 3 |

### Motor End State Constants

For `motor_set_end_state` and `movement_set_end_state`:

| Constant | Value | Behavior |
|---|---|---|
| `le.MOTOR_END_STATE_COAST` | 0 | Motor coasts to a stop (no resistance) |
| `le.MOTOR_END_STATE_BRAKE` | 1 | Motor brakes (resists movement) |
| `le.MOTOR_END_STATE_HOLD` | 2 | Motor actively holds position |
| `le.MOTOR_END_STATE_CONTINUE` | 3 | Motor keeps running |
| `le.MOTOR_END_STATE_SMART_COAST` | 4 | Smart coast |
| `le.MOTOR_END_STATE_SMART_BRAKE` | 5 | Smart brake |

### Motor Index Constants (DoubleMotor)

| Constant | Value |
|---|---|
| `le.MOTOR_LEFT` | 0 |
| `le.MOTOR_RIGHT` | 1 |
| `le.MOTOR_BOTH` | 2 |

### Device Face Constants

For `imu_set_yaw_face`:

| Constant | Value |
|---|---|
| `le.DEVICE_FACE_TOP` | 0 |
| `le.DEVICE_FACE_FRONT` | 1 |
| `le.DEVICE_FACE_RIGHT` | 2 |
| `le.DEVICE_FACE_BOTTOM` | 3 |
| `le.DEVICE_FACE_BACK` | 4 |
| `le.DEVICE_FACE_LEFT` | 5 |

### Light Pattern Constants

For `light_color({ pattern: ... })`:

| Constant | Value |
|---|---|
| `le.LIGHT_PATTERN_SOLID` | 0 |
| `le.LIGHT_PATTERN_BREATHE` | 1 |
| `le.LIGHT_PATTERN_PULSE` | 2 |
| `le.LIGHT_PATTERN_SHORT_BLINK` | 3 |
| `le.LIGHT_PATTERN_LONG_BLINK` | 4 |
| `le.LIGHT_PATTERN_DOUBLE_BLINK` | 5 |

### Sound Pattern Constants

For `play_beep({ pattern: ... })`:

| Constant | Value |
|---|---|
| `le.SOUND_PATTERN_BEEP_SINGLE` | 0 |
| `le.SOUND_PATTERN_BEEP_DOUBLE` | 1 |
| `le.SOUND_PATTERN_BEEP_TRIPLE` | 2 |
| `le.SOUND_PATTERN_BEEP_UP_MIDDLE_DOWN` | 3 |

### Motor State Constants (read from notifications)

Values of `motor.motorState`:

| Constant | Value |
|---|---|
| `le.MOTOR_STATE_READY` | 0 |
| `le.MOTOR_STATE_RUNNING` | 1 |
| `le.MOTOR_STATE_STALLED` | 2 |
| `le.MOTOR_STATE_CMD_ABORTED` | 3 |
| `le.MOTOR_STATE_REGULATION_ERROR` | 4 |
| `le.MOTOR_STATE_MOTOR_DISCONNECTED` | 5 |
| `le.MOTOR_STATE_HOLDING` | 6 |
| `le.MOTOR_STATE_DC_RUNNING` | 7 |
| `le.MOTOR_STATE_NOT_ALLOWED_TO_RUN` | 8 |

### Motion Gesture Constants (DoubleMotor IMU)

Values of `imu_gesture.gesture`:

| Constant | Value |
|---|---|
| `le.MOTION_GESTURE_NO_GESTURE` | -1 |
| `le.MOTION_GESTURE_TAPPED` | 0 |
| `le.MOTION_GESTURE_DOUBLE_TAPPED` | 1 |
| `le.MOTION_GESTURE_COLLISION` | 2 |
| `le.MOTION_GESTURE_SHAKE` | 3 |
| `le.MOTION_GESTURE_FREEFALL` | 4 |

### Motor Gesture Constants (read from motor notifications)

Values of `motor.gesture`:

| Constant | Value |
|---|---|
| `le.MOTOR_GESTURE_NO_GESTURE` | -1 |
| `le.MOTOR_GESTURE_SLOW_CLOCKWISE` | 1 |
| `le.MOTOR_GESTURE_FAST_CLOCKWISE` | 2 |
| `le.MOTOR_GESTURE_SLOW_COUNTERCLOCKWISE` | 3 |
| `le.MOTOR_GESTURE_FAST_COUNTERCLOCKWISE` | 4 |
| `le.MOTOR_GESTURE_WIGGLED` | 5 |

### Button State Constants

| Constant | Value |
|---|---|
| `le.BUTTON_STATE_RELEASED` | 0 |
| `le.BUTTON_STATE_PRESSED` | 1 |

---

## Complete API Quick Reference

### SingleMotor Methods

| Method | Parameters | Description |
|---|---|---|
| `connect()` | `{notification_delay?}` | Connect via Web Bluetooth |
| `disconnect()` | -- | Disconnect |
| `info()` | -- | Get device/firmware info |
| `device_uuid()` | -- | Get device UUID |
| `light_color(color, opts?)` | `color`, `{pattern?, intensity?, blocking?}` | Set LED color |
| `play_beep(opts?)` | `{pattern?, frequency?, repetitions?, blocking?}` | Play beep sound |
| `stop_sound(opts?)` | `{blocking?}` | Stop sounds |
| `motor_run(opts?)` | `{direction?, motor?, speed?, blocking?}` | Run continuously |
| `motor_run_for_degrees(degrees, opts?)` | `degrees`, `{direction?, motor?, speed?, blocking?}` | Run for degrees |
| `motor_run_for_time(time_ms, opts?)` | `time_ms`, `{direction?, motor?, speed?, blocking?}` | Run for duration |
| `motor_run_to_absolute_position(pos, opts?)` | `position`, `{direction?, motor?, speed?, blocking?}` | Go to absolute position |
| `motor_run_to_relative_position(pos, opts?)` | `position`, `{motor?, speed?, blocking?}` | Go to relative position |
| `motor_stop(opts?)` | `{motor?, blocking?}` | Stop motor |
| `motor_set_speed(speed, opts?)` | `speed`, `{motor?, blocking?}` | Set speed (-100 to 100) |
| `motor_set_duty_cycle(dc, opts?)` | `duty_cycle`, `{motor?, blocking?}` | Set raw duty cycle |
| `motor_set_end_state(state, opts?)` | `end_state`, `{motor?, blocking?}` | Set stop behavior |
| `motor_set_acceleration(accel, decel, opts?)` | `accel`, `decel`, `{motor?, blocking?}` | Set accel/decel (0-100) |
| `motor_reset_relative_position(opts?)` | `{motor?, position?, blocking?}` | Reset position counter |
| `set_notification_callback(fn)` | `callback` | Set notification handler |

### DoubleMotor Additional Methods

Inherits all SingleMotor methods (use `motor: le.MOTOR_LEFT / MOTOR_RIGHT / MOTOR_BOTH`), plus:

| Method | Parameters | Description |
|---|---|---|
| `movement_move(opts?)` | `{direction?, speed?, blocking?}` | Drive in direction |
| `movement_move_for_time(time_ms, opts?)` | `time_ms`, `{direction?, speed?, blocking?}` | Drive for duration |
| `movement_move_for_degrees(deg, opts?)` | `degrees`, `{direction?, speed?, blocking?}` | Drive for motor degrees |
| `movement_move_tank(spdL, spdR, opts?)` | `speed_left`, `speed_right`, `{blocking?}` | Tank drive |
| `movement_move_tank_for_degrees(deg, opts?)` | `degrees`, `{speed_left?, speed_right?, blocking?}` | Tank for degrees |
| `movement_turn_for_degrees(deg, opts?)` | `degrees`, `{direction?, speed?, blocking?}` | IMU-guided turn |
| `movement_stop(opts?)` | `{blocking?}` | Stop all movement |
| `movement_set_speed(speed, opts?)` | `speed`, `{blocking?}` | Set default move speed |
| `movement_set_end_state(state, opts?)` | `end_state`, `{blocking?}` | Set movement stop behavior |
| `movement_set_acceleration(a, d, opts?)` | `accel`, `decel`, `{blocking?}` | Set movement accel/decel |
| `movement_set_turn_steering(val, opts?)` | `steering`, `{blocking?}` | Set turn sharpness (0-100) |
| `imu_set_yaw_face(face, opts?)` | `yaw_face`, `{blocking?}` | Set yaw reference face |
| `imu_reset_yaw_axis(val?, opts?)` | `value?`, `{blocking?}` | Reset yaw to value |

### ColorSensor and Controller

These only use the common methods (`connect`, `disconnect`, `light_color`, `play_beep`, `stop_sound`, `info`, `device_uuid`). Their value comes from the live data properties updated automatically by notifications.

---

## Full Example: Multi-Device App

```html
<!DOCTYPE html>
<html>
<head><title>LEGO App</title></head>
<body>
  <button id="connectMotor">Connect Motor</button>
  <button id="connectSensor">Connect Sensor</button>
  <button id="go">Go!</button>
  <div id="output"></div>

  <script src="lego-education-ble.js"></script>
  <script>
    const le = legoeducation;
    const singlemotor = new le.SingleMotor();
    const colorsensor = new le.ColorSensor();

    document.getElementById('connectMotor').onclick = () => singlemotor.connect();
    document.getElementById('connectSensor').onclick = () => colorsensor.connect();

    document.getElementById('go').onclick = async () => {
      // Color-reactive motor: motor speed depends on detected color
      setInterval(async () => {
        if (!singlemotor.connected || !colorsensor.connected) return;

        const color = colorsensor.sensor.color;
        if (color === le.LEGO_COLOR_RED) {
          await singlemotor.motor_run({ speed: 100 });
          await singlemotor.light_color(le.LEGO_COLOR_RED);
        } else if (color === le.LEGO_COLOR_BLUE) {
          await singlemotor.motor_run({ speed: 30 });
          await singlemotor.light_color(le.LEGO_COLOR_BLUE);
        } else {
          await singlemotor.motor_stop();
          await singlemotor.light_color(le.LEGO_COLOR_NOCOLOR);
        }

        document.getElementById('output').textContent =
          `Color: ${le.LEGO_COLOR_NAME_MAP[color]}, Motor: ${singlemotor.motor.speed}%`;
      }, 200);
    };
  </script>
</body>
</html>
```

---

## Important Notes

- **User gesture required:** `connect()` must be called from a click/tap handler. The browser shows a device picker dialog.
- **One device per `connect()` call:** Each device class instance manages one BLE connection. To use multiple devices, create multiple instances and connect each separately.
- **Live data starts as NaN:** Before the first notification arrives (~200ms after connect), all sensor/motor properties contain `NaN`. Check with `isNaN()` or wait for the first notification callback.
- **Async/await:** All command methods are async. Use `await` or `.then()`.
- **Non-blocking mode:** Pass `blocking: false` to skip waiting for the device's ACK. Useful for rapid-fire commands like joystick control.
- **HTTPS required:** Web Bluetooth only works on secure origins (HTTPS or localhost).
