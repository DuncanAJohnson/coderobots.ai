"""LEGO Education hardware doc bundles.

Sourced from src/prompts/legoEducation_priming.js. Content is in Danish (matching
the JS source). Bundle split: single_motor, double_motor, color_sensor, controller,
shared (common BLE callbacks/constants/rules).
"""

PREAMBLE = """\
You are helping a student write Python to control LEGO Education hardware over
Web Bluetooth. The Python runs in the browser via Pyodide and calls into a JS
BLE client through the 'legoeducation' module (typically aliased as 'le').

Use 'import legoeducation as le'. Never call BLE APIs directly. There is NO
hub module, motor_pair, or port module here — this is not SPIKE Prime; only the
four device classes apply.

When responding with code, format the code block as ```python and comment thoroughly.
The student cannot see the documentation; never reference "above" or "the docs".

Hardware-id (id=):
Hver fysisk enhed forbindes via knappen "Forbind hardware" i UI'et. Naar den er
forbundet, vises et lille ikon ved siden af knappen med en hover-popup. I popup'en
har hver enhed et string-id (som standard "1", "2", ...), som eleven kan aendre.
Brug id'et i Python for at vaelge en specifik enhed naar flere af samme type er
forbundet:

```python
venstre_motor = le.SingleMotor(id='venstre')
hoejre_motor  = le.SingleMotor(id='hoejre')
venstre_motor.connect()
hoejre_motor.connect()
```

Hvis kun én enhed af en bestemt type er forbundet, kan id= udelades:
`le.SingleMotor()` rammer den foerste forbundne enkelt-motor.

`card_color` og `card_serial` accepteres stadig i .connect() for bagudkompatibilitet,
men er ikke laengere noedvendige — UI'et har allerede valgt enheden.

Standardmoenster (always show this scaffold to the student):
```python
import legoeducation as le
import time

# Opret Python-objektet og forbind til hardwaren.
# Tilfoej id='navn' hvis flere enheder af samme type er forbundet.
device = le.SingleMotor()  # eller DoubleMotor / ColorSensor / Controller
device.connect()

if not device.connected:
    print('Fejl: Kunne ikke forbinde.')
    exit(1)

# elev-kode her
device.disconnect()
exit(0)
```
"""

_SINGLE_MOTOR = """\
--- le.SingleMotor ---
Methods:
  motor.connect()                     # tilfoej id='navn' naar flere motorer er forbundet
  motor.disconnect()
  motor.motor_run(direction=le.MOTOR_MOVE_DIRECTION_CLOCKWISE, speed=50)
      Starter motoren. Koerer til motor_stop() kaldes.
  motor.motor_run_for_degrees(degrees=360, direction=le.MOTOR_MOVE_DIRECTION_CLOCKWISE, speed=50)
  motor.motor_run_for_time(time_ms=2000, direction=le.MOTOR_MOVE_DIRECTION_CLOCKWISE, speed=50)
  motor.motor_set_speed(40)
  motor.motor_stop()

Live data (motor.motor):
  motor.motor.position       # relativ position i grader
  motor.motor.absolutePos    # absolut position
  motor.motor.speed
  motor.motor.power
  motor.motor.motorState     # sammenlign med Motor State-konstanter
  motor.motor.gesture        # sammenlign med Motor Gesture-konstanter
"""

_DOUBLE_MOTOR = """\
--- le.DoubleMotor ---
To motorer + IMU. Understoetter koordinerede 'movement'-kommandoer og individuel motor-styring.

Koordinerede bevaegelseskommandoer (begge motorer samtidig):
  dm.movement_move_for_degrees(degrees=180, direction=le.MOVEMENT_DIRECTION_FORWARD, speed=50)
  dm.movement_move_for_time(time_ms=1000, direction=le.MOVEMENT_DIRECTION_BACKWARD, speed=50)
  dm.movement_turn_for_degrees(degrees=90, direction=le.MOVEMENT_TURN_DIRECTION_LEFT, speed=40)

Individuelle motor-metoder (vaelg motor med motor=-argument):
  dm.motor_run(direction=le.MOTOR_MOVE_DIRECTION_COUNTERCLOCKWISE, motor=le.MOTOR_RIGHT, speed=50)
  dm.motor_run_for_degrees(360, motor=le.MOTOR_LEFT, speed=30)
  dm.motor_run_for_time(2000)
  dm.motor_stop()

IMU-indstillinger:
  dm.imu_reset_yaw_axis(0)
  dm.imu_set_yaw_face(yaw_face=le.DEVICE_FACE_LEFT)

Live data:
  dm.motor[le.MOTOR_LEFT].position / .speed / .absolutePos / .power / .motorState / .gesture
  dm.motor[le.MOTOR_RIGHT].position / ...
  dm.imu_device.yaw / .pitch / .roll
  dm.imu_device.orientation       # sammenlign med Device Face-konstanter
  dm.imu_device.accelerometerX/Y/Z
  dm.imu_device.gyroscopeX/Y/Z
  dm.imu_gesture.gesture          # sammenlign med Motion Gesture-konstanter
"""

_COLOR_SENSOR = """\
--- le.ColorSensor ---
```python
sensor = le.ColorSensor()  # tilfoej id='navn' for at vaelge en specifik sensor
sensor.connect()

if not sensor.connected:
    print('Fejl: Kunne ikke forbinde til farvesensoren.')
    exit(1)

farve = sensor.sensor.color
if farve == le.LEGO_COLOR_RED:
    print('Ser roed!')
elif farve == le.LEGO_COLOR_BLUE:
    print('Ser blaa!')

sensor.disconnect()
```

Live data (sensor.sensor):
  color                    # sammenlign med LEGO_COLOR_*-konstanter
  reflection
  rawRed, rawGreen, rawBlue
  hue, saturation, value
"""

_CONTROLLER = """\
--- le.Controller ---
```python
# Med to controllere kan du bruge id= til at skelne dem:
controller1 = le.Controller(id='1')
controller2 = le.Controller(id='duncan')
controller1.connect()
controller2.connect()

venstre = controller1.sensor.leftPercent    # -100 til 100
hoejre  = controller1.sensor.rightPercent   # -100 til 100
```

Live data (controller.sensor):
  leftPercent, rightPercent
  leftAngle, rightAngle
"""

_SHARED = """\
--- Faelles hardware-kontrol (alle enheder) ---
  enhed.light_color(le.LEGO_COLOR_BLUE, pattern=le.LIGHT_PATTERN_BREATHE, intensity=100)
  enhed.beep(pattern=le.SOUND_PATTERN_BEEP_SINGLE, frequency=440)

--- Notifikations-callbacks (avanceret) ---
Alle enheder kan streame data via en callback:
```python
def notification_callback(data):
    parsed_items = le.device_notification_parser(data)
    for parsed_item in parsed_items:
        if isinstance(parsed_item, le.MotorNotification):
            print(f"Position: {parsed_item.position}")
        # ogsaa: le.ColorSensorNotification, le.ControllerNotification

enhed.set_notification_callback(notification_callback)
```
DoubleMotor: skel venstre/hoejre via parsed_item.motorBitMask
  le.MOTOR_BITS_LEFT, le.MOTOR_BITS_RIGHT

--- Konstanter ---
Farver:
  le.LEGO_COLOR_NOCOLOR, RED, YELLOW, BLUE, TEAL, GREEN, PURPLE, WHITE, MAGENTA,
  ORANGE, AZURE
Motor-retning:
  le.MOTOR_MOVE_DIRECTION_CLOCKWISE / COUNTERCLOCKWISE
Bevaegelsesretning (DoubleMotor):
  le.MOVEMENT_DIRECTION_FORWARD / BACKWARD
  le.MOVEMENT_TURN_DIRECTION_LEFT / RIGHT
Motor-vaelger (DoubleMotor):
  le.MOTOR_LEFT, le.MOTOR_RIGHT
  le.MOTOR_BITS_LEFT, le.MOTOR_BITS_RIGHT       # til notification-callbacks
Lys-moenstre: le.LIGHT_PATTERN_BREATHE m.fl.
Lyd-moenstre: le.SOUND_PATTERN_BEEP_SINGLE m.fl.
Device Face (IMU): le.DEVICE_FACE_LEFT m.fl.

--- Vigtige regler ---
1. BRUG ALTID NOEGLEORDSARGUMENTER for speed, direction, motor, degrees, time_ms.
   Eksempel: motor.motor_run(speed=50) — IKKE motor.motor_run(50).
2. .connect() behoever INGEN argumenter laengere — UI'et har allerede valgt
   enheden. Hvis flere af samme type er forbundet, skal Python-objektet oprettes
   med id='navn' (f.eks. `le.SingleMotor(id='venstre')`), hvor navnet matcher
   det id, eleven har givet enheden i hover-popup'en ved "Forbind hardware"-knappen.
3. Tjek altid 'enhed.connected' efter .connect() og giv en fejlbesked hvis det fejler
   (exit(1)).
4. 'time' modulet fungerer: import time; time.sleep(1) er ok til korte ventetider.
5. Importer altid 'import legoeducation as le'. Aldrig direkte BLE eller js-modul.
6. Afslut programmet rent: kald .disconnect() paa alle enheder og afslut med exit(0).
"""

EXAMPLES = ""  # Examples are baked into each bundle's code blocks above.

BUNDLES: dict[str, str] = {
    "single_motor": _SINGLE_MOTOR,
    "double_motor": _DOUBLE_MOTOR,
    "color_sensor": _COLOR_SENSOR,
    "controller": _CONTROLLER,
    "shared": _SHARED,
}

BUNDLE_DESCRIPTIONS: dict[str, str] = {
    "single_motor": "le.SingleMotor — a standalone single motor (run, run_for_degrees, run_for_time, stop) and live position/speed data.",
    "double_motor": "le.DoubleMotor — a dual-motor + IMU device; coordinated movement_* drive commands, individual motor= control, and IMU yaw/pitch/roll/accel/gyro data.",
    "color_sensor": "le.ColorSensor — color, reflection, raw RGB, and HSV readings.",
    "controller": "le.Controller — a two-handle controller exposing leftPercent/rightPercent and leftAngle/rightAngle.",
    "shared": "Cross-device helpers and rules: light_color/beep, notification callbacks, color/motor/movement/light/sound/IMU constants, and important coding rules.",
}

# Always-include fallback when the router returns nothing — the rules + constants
# bundle is universally relevant.
DEFAULT_BUNDLES: list[str] = ["shared"]
