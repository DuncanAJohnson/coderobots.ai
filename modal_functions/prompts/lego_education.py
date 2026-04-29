"""LEGO Education hardware doc bundles.

Sourced from src/prompts/legoEducation_priming.js. Content is in Danish (matching
the JS source). Bundle split: single_motor, double_motor, color_sensor, controller,
shared (common constants/rules).
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
Always respond with text alongside whatever code you send -- never just code.

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

if device.connected:
    # elev-kode her
    device.disconnect()
else:
    print('Fejl: Kunne ikke forbinde.')
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

Example 1 — koer en halv omdrejning og stop:
```python
import legoeducation as le

motor = le.SingleMotor()
motor.connect()

if motor.connected:
    # 180 grader med uret ved hastighed 60
    motor.motor_run_for_degrees(degrees=180,
                                direction=le.MOTOR_MOVE_DIRECTION_CLOCKWISE,
                                speed=60)
    motor.disconnect()
else:
    print('Fejl: Kunne ikke forbinde.')
```

Example 2 — koer i et bestemt tidsrum, derefter modsat retning:
```python
import legoeducation as le
import time

motor = le.SingleMotor()
motor.connect()

if motor.connected:
    motor.motor_run_for_time(time_ms=1500,
                             direction=le.MOTOR_MOVE_DIRECTION_CLOCKWISE,
                             speed=70)
    time.sleep(0.5)  # kort pause
    motor.motor_run_for_time(time_ms=1500,
                             direction=le.MOTOR_MOVE_DIRECTION_COUNTERCLOCKWISE,
                             speed=70)
    motor.disconnect()
else:
    print('Fejl: Kunne ikke forbinde.')
```

Example 3 — start motoren, laes live position, og stop ved en graense:
```python
import legoeducation as le
import time

motor = le.SingleMotor()
motor.connect()

if motor.connected:
    motor.motor_run(direction=le.MOTOR_MOVE_DIRECTION_CLOCKWISE, speed=40)
    while motor.motor.position < 720:   # to omdrejninger
        print('position:', motor.motor.position, 'speed:', motor.motor.speed)
        time.sleep(0.1)
    motor.motor_stop()
    motor.disconnect()
else:
    print('Fejl: Kunne ikke forbinde.')
```

Example 4 — to motorer med id, koerer modsat hinanden:
```python
import legoeducation as le

venstre = le.SingleMotor(id='venstre')
hoejre  = le.SingleMotor(id='hoejre')
venstre.connect()
hoejre.connect()

if venstre.connected and hoejre.connected:
    venstre.motor_run_for_time(time_ms=2000,
                               direction=le.MOTOR_MOVE_DIRECTION_CLOCKWISE,
                               speed=50)
    hoejre.motor_run_for_time(time_ms=2000,
                              direction=le.MOTOR_MOVE_DIRECTION_COUNTERCLOCKWISE,
                              speed=50)
    venstre.disconnect()
    hoejre.disconnect()
else:
    print('Fejl: En eller begge motorer kunne ikke forbinde.')
```
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

Example 1 — koer fremad, drej, koer fremad (en simpel 'L'-rute):
```python
import legoeducation as le

dm = le.DoubleMotor()
dm.connect()

if dm.connected:
    dm.movement_move_for_time(time_ms=1500,
                              direction=le.MOVEMENT_DIRECTION_FORWARD,
                              speed=50)
    dm.movement_turn_for_degrees(degrees=90,
                                 direction=le.MOVEMENT_TURN_DIRECTION_RIGHT,
                                 speed=40)
    dm.movement_move_for_time(time_ms=1500,
                              direction=le.MOVEMENT_DIRECTION_FORWARD,
                              speed=50)
    dm.disconnect()
else:
    print('Fejl: Kunne ikke forbinde.')
```

Example 2 — kvadrat ved hjaelp af en for-loekke:
```python
import legoeducation as le

dm = le.DoubleMotor()
dm.connect()

if dm.connected:
    for _ in range(4):
        dm.movement_move_for_degrees(degrees=360,
                                     direction=le.MOVEMENT_DIRECTION_FORWARD,
                                     speed=50)
        dm.movement_turn_for_degrees(degrees=90,
                                     direction=le.MOVEMENT_TURN_DIRECTION_LEFT,
                                     speed=40)
    dm.disconnect()
else:
    print('Fejl: Kunne ikke forbinde.')
```

Example 3 — individuelle motorer som tank-styring (modsatte retninger = drej paa stedet):
```python
import legoeducation as le
import time

dm = le.DoubleMotor()
dm.connect()

if dm.connected:
    dm.motor_run(direction=le.MOTOR_MOVE_DIRECTION_CLOCKWISE,
                 motor=le.MOTOR_LEFT, speed=50)
    dm.motor_run(direction=le.MOTOR_MOVE_DIRECTION_COUNTERCLOCKWISE,
                 motor=le.MOTOR_RIGHT, speed=50)
    time.sleep(2)         # drej i 2 sekunder
    dm.motor_stop()
    dm.disconnect()
else:
    print('Fejl: Kunne ikke forbinde.')
```

Example 4 — brug IMU yaw til at dreje praecist 180 grader:
We do not currently support IMU yaw. Tell the user this if they want to use it.

Example 5 — laes hjul-position fra begge motorer mens robotten koerer:
```python
import legoeducation as le
import time

dm = le.DoubleMotor()
dm.connect()

if dm.connected:
    dm.movement_move_for_time(time_ms=3000,
                              direction=le.MOVEMENT_DIRECTION_FORWARD,
                              speed=40)
    # laes mens den koerer (movement_move_for_time blokerer ikke nedenstaaende loop
    # naar du allerede har afsluttet movement-kald — brug i stedet motor_run + stop
    # hvis du vil laese live mens hjulene koerer)
    for _ in range(20):
        v = dm.motor[le.MOTOR_LEFT].position
        h = dm.motor[le.MOTOR_RIGHT].position
        print('venstre:', v, 'hoejre:', h)
        time.sleep(0.1)
    dm.disconnect()
else:
    print('Fejl: Kunne ikke forbinde.')
```
"""

_COLOR_SENSOR = """\
--- le.ColorSensor ---
Live data (sensor.sensor):
  color                    # sammenlign med LEGO_COLOR_*-konstanter
  reflection               # 0–100 (procent)
  rawRed, rawGreen, rawBlue
  hue, saturation, value

Example 1 — laes farven en gang:
```python
import legoeducation as le

sensor = le.ColorSensor()
sensor.connect()

if sensor.connected:
    farve = sensor.sensor.color
    if farve == le.LEGO_COLOR_RED:
        print('Ser roed!')
    elif farve == le.LEGO_COLOR_BLUE:
        print('Ser blaa!')
    else:
        print('Anden farve:', farve)
    sensor.disconnect()
else:
    print('Fejl: Kunne ikke forbinde til farvesensoren.')
```

Example 2 — loop og reager paa farver i realtid:
```python
import legoeducation as le
import time

sensor = le.ColorSensor()
sensor.connect()

if sensor.connected:
    for _ in range(50):                      # ca. 5 sekunder
        farve = sensor.sensor.color
        if farve == le.LEGO_COLOR_GREEN:
            print('GROEN — fortsaet')
        elif farve == le.LEGO_COLOR_RED:
            print('ROED — stop')
            break
        time.sleep(0.1)
    sensor.disconnect()
else:
    print('Fejl: Kunne ikke forbinde til farvesensoren.')
```

Example 3 — brug 'reflection' til linje-detektion:
```python
import legoeducation as le
import time

sensor = le.ColorSensor()
sensor.connect()

if sensor.connected:
    for _ in range(30):
        r = sensor.sensor.reflection
        if r < 20:
            print('Moerk overflade (linje)')
        elif r > 70:
            print('Lys overflade')
        else:
            print('Mellem:', r)
        time.sleep(0.1)
    sensor.disconnect()
else:
    print('Fejl: Kunne ikke forbinde til farvesensoren.')
```

Example 4 — laes raa RGB og HSV-vaerdier:
```python
import legoeducation as le
import time

sensor = le.ColorSensor()
sensor.connect()

if sensor.connected:
    for _ in range(10):
        s = sensor.sensor
        print('RGB:', s.rawRed, s.rawGreen, s.rawBlue,
              ' HSV:', s.hue, s.saturation, s.value)
        time.sleep(0.2)
    sensor.disconnect()
else:
    print('Fejl: Kunne ikke forbinde til farvesensoren.')
```

Example 5 — to farvesensorer med id (f.eks. en foran og en bagved robotten):
```python
import legoeducation as le
import time

# id-strengene ('foran' og 'bagved') skal matche dem, eleven har sat
# i hover-popup'en ved "Forbind hardware"-knappen.
foran   = le.ColorSensor(id='foran')
bagved  = le.ColorSensor(id='bagved')
foran.connect()
bagved.connect()

if foran.connected and bagved.connected:
    for _ in range(30):
        f = foran.sensor.color
        b = bagved.sensor.color
        if f == le.LEGO_COLOR_RED:
            print('Forrest sensor ser ROED — bremse')
        if b == le.LEGO_COLOR_GREEN:
            print('Bagerst sensor ser GROEN — fortsaet')
        time.sleep(0.1)
    foran.disconnect()
    bagved.disconnect()
else:
    print('Fejl: En af farvesensorerne kunne ikke forbinde.')
```
"""

_CONTROLLER = """\
--- le.Controller ---
Live data (controller.sensor):
  leftPercent, rightPercent           # -100 til 100 (joystick-udsving)
  leftAngle, rightAngle               # raa vinkel i grader

Example 1 — laes joystick-vaerdier i et loop:
```python
import legoeducation as le
import time

ctrl = le.Controller()
ctrl.connect()

if ctrl.connected:
    for _ in range(50):
        v = ctrl.sensor.leftPercent
        h = ctrl.sensor.rightPercent
        print('venstre:', v, ' hoejre:', h)
        time.sleep(0.1)
    ctrl.disconnect()
else:
    print('Fejl: Kunne ikke forbinde til controlleren.')
```

Example 2 — brug controlleren til at styre en DoubleMotor:
```python
import legoeducation as le
import time

ctrl  = le.Controller()
motor = le.DoubleMotor()
ctrl.connect()
motor.connect()

if ctrl.connected and motor.connected:
    for i in range(50):
        speed_left = controller.sensor.leftPercent
        speed_right = controller.sensor.rightPercent
        motor.movement_move_tank(speed_left=speed_left, speed_right=speed_right)
        time.sleep(0.1)
    motor.motor_stop()
    motor.disconnect()
    ctrl.disconnect()
else:
    print('Fejl: En enhed kunne ikke forbinde.')
```

Example 3 — to controllere med id (f.eks. til to spillere):
```python
import legoeducation as le
import time

c1 = le.Controller(id='1')
c2 = le.Controller(id='2')
c1.connect()
c2.connect()

if c1.connected and c2.connected:
    for _ in range(30):
        print('Spiller 1 venstre:', c1.sensor.leftPercent,
              ' Spiller 2 venstre:', c2.sensor.leftPercent)
        time.sleep(0.2)
    c1.disconnect()
    c2.disconnect()
else:
    print('Fejl: En af controllerne kunne ikke forbinde.')
```

Example 4 — laes raa vinkel (leftAngle) i stedet for procent:
```python
import legoeducation as le
import time

ctrl = le.Controller()
ctrl.connect()

if ctrl.connected:
    for _ in range(20):
        print('vinkel venstre:', ctrl.sensor.leftAngle,
              ' vinkel hoejre:', ctrl.sensor.rightAngle)
        time.sleep(0.2)
    ctrl.disconnect()
else:
    print('Fejl: Kunne ikke forbinde til controlleren.')
```
"""

_SHARED = """\
--- Faelles hardware-kontrol (alle enheder) ---
  enhed.light_color(le.LEGO_COLOR_BLUE, pattern=le.LIGHT_PATTERN_BREATHE, intensity=100)
  enhed.beep(pattern=le.SOUND_PATTERN_BEEP_SINGLE, frequency=440)

Example 1 — saet lys og giv et bip ved start og slut:
```python
import legoeducation as le
import time

motor = le.SingleMotor()
motor.connect()

if motor.connected:
    motor.light_color(le.LEGO_COLOR_GREEN,
                      pattern=le.LIGHT_PATTERN_BREATHE,
                      intensity=100)
    motor.beep(pattern=le.SOUND_PATTERN_BEEP_SINGLE, frequency=523)

    motor.motor_run_for_time(time_ms=1500,
                             direction=le.MOTOR_MOVE_DIRECTION_CLOCKWISE,
                             speed=50)

    motor.light_color(le.LEGO_COLOR_RED, intensity=100)
    motor.beep(pattern=le.SOUND_PATTERN_BEEP_SINGLE, frequency=261)
    time.sleep(0.5)
    motor.disconnect()
else:
    print('Fejl: Kunne ikke forbinde.')
```

Example 2 — skift lysfarve afhaengigt af sensor-aflaesning:
```python
import legoeducation as le
import time

sensor = le.ColorSensor()
sensor.connect()

if sensor.connected:
    for _ in range(30):
        farve = sensor.sensor.color
        if farve == le.LEGO_COLOR_RED:
            sensor.light_color(le.LEGO_COLOR_RED, intensity=100)
        elif farve == le.LEGO_COLOR_GREEN:
            sensor.light_color(le.LEGO_COLOR_GREEN, intensity=100)
        else:
            sensor.light_color(le.LEGO_COLOR_WHITE, intensity=50)
        time.sleep(0.1)
    sensor.disconnect()
else:
    print('Fejl: Kunne ikke forbinde.')
```

--- Notifikations-callbacks (avanceret) ---
Notification callbacks are not supported in the current editor. If the user
asks, tell them they don't work.

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
3. Tjek altid 'enhed.connected' efter .connect() og giv en fejlbesked hvis det fejler.
   Brug en if/else-struktur — kald IKKE exit() (det kaster en fejl i Pyodide).
4. 'time' modulet fungerer: import time; time.sleep(1) er ok til korte ventetider.
5. Importer altid 'import legoeducation as le'. Aldrig direkte BLE eller js-modul.
6. Afslut programmet rent: kald .disconnect() paa alle enheder foer programmet slutter.
   Brug ALDRIG exit() — programmet afsluttes naturligt naar koden loeber ud.
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
