export const spike2Documentation = `

Getting Started Back to Top
Here is a place you can start to learn to code with Python. You will find in the following parts of this “Getting Started” many examples of programs you can use as you explore the Python functionalities of SPIKE.

Alright, here we go!

Writing a Python Program
Example 1: Programming Simple Outputs
Example 2: Controlling the Motors
Example 3: Using the Force Sensor
Example 4: Changing the Flow with Loops & Conditions
Example 5: Using the Color Sensor
Example 6: Using the Distance Sensor
Example 7: Using The Motion Sensor
Example 8: Driving
More Python Basics
Common SPIKE Python Commands
Writing a Python Program
Python is a very intuitive text-based coding language. It’s an excellent programming language for beginners because it’s concise and easy-to-read. It’s also an excellent language for programmers because it can be used for everything from web development to software development and scientific applications.

There are only a few rules that you have to keep in mind when writing commands.

Importing Libraries
Comments in Python
Indenting
Importing Libraries
When creating Python projects, you’ll often have to import a library of functions. In terms of programming, a library is basically all of the possible “ingredients” you can to use to create your “recipe.”

When using SPIKE, you must always "include" the library that’s linked to the different hardware components (e.g., motors, Hub, sensors).

from spike import PrimeHub, MotorPair
Here are some of the libraries that you can import:

App
Hub
Light Matrix
Buttons
Speaker
Brick Status Light
Motion Sensor
Distance Sensor
Color Sensor
Force Sensor
Motor
Motor Pair
Operators
The imported libraries are located at the beginning of the .py file, and should appear only once in the program.

If you’re unsure of which libraries you should import, you can always import everything possible using:

from spike import PrimeHub, LightMatrix, Button, StatusLight, ForceSensor, MotionSensor, Speaker, ColorSensor, App, DistanceSensor, Motor, MotorPair
from spike.control import wait_for_seconds, wait_until, Timer
Comments in Python
Every line starting with a “#” is considered a comment. Therefore, it isn’t executed as an action.

# This is a comment
# This is another comment
Indenting
Python is sensitive to capitalization, spaces, and indenting. This makes it easier to code, once you’re familiar with the rules. For example, there’s a difference between:

x = 0
if x == 1:
print('LEGO')
and

x = 0
if x == 1:
	print('LEGO')
Example 1: Programming Simple Outputs
What You’ll Need
This is the Hub. You're going to create some short programs for it.



Make sure that you’ve: installed the battery
Turned it on by pressing the Center Button
Connected it to your device via Bluetooth or USB
Controlling the Light Matrix
Create your first program using Python.

Copy the code below.
Paste the code to the Programming Canvas. That is the space where you will write Python code.
Lines with a "#" are comments; they will not influence the actions. The other lines are your program. Can you figure out what this first program is all about?

Then, play the program!
# Import the PrimeHub class
from spike import PrimeHub
from spike.control import wait_for_seconds
# Initialize the Hub
your_hub = PrimeHub()
# Light up a smiley face
your_hub.light_matrix.show_image('HAPPY')
wait_for_seconds(5)
your_hub.light_matrix.off()
You should see this on the Hub.



Change the image that’s displayed on the Light Matrix.
Either change the parameter 'HAPPY' to 'HEART' in the code you already have. This will light up the heart instead of the happy face on the Hub.
Or, copy in the code in the box bellow and paste it after the last line of your program. This will light up the happy face for 5 seconds, and then it will light up a heart for 5 seconds.
# Add another image
your_hub.light_matrix.show_image('HEART')
wait_for_seconds(5)
your_hub.light_matrix.off()
Playing Small Beeps and Time
Let’s make the Hub play some beeps.

If you have a program on the Programming Canvas, it is a good idea to delete it or start a new project to continue.
Then, copy the code below to the Programming Canvas.
Make sure you have only one line of code that starts with:
from spike import
Play the program!
# Import the PrimeHub class
from spike import PrimeHub
# Initialize the Hub
hub = PrimeHub()
# beep beep beep!
hub.speaker.beep(60, 1)
Change the beat and the tone. Here is one way to do it.

# Here’s a new song
hub.speaker.beep(60, 0.5)
hub.speaker.beep(67, 1.0)
wait_for_seconds(0.5)
hub.speaker.beep(60, 0.5)
Playing Sounds
You can also add some sounds to be played from your device.

Copy the code below to the Programming Canvas. Play the program!
# Import the PrimeHub class
from spike import App
# Initialize the app
app = App()
app.play_sound('Cat Meow 1')
Pick another sound to play, or use this program.
app.play_sound('Triumph')
Challenge
Use the functions you’ve learned so far.

Create a short countdown program, something like 3, 2, 1, BOOM!

Example 2: Controlling the Motors
What You’ll Need


Now we’ll connect a motor and turn it on. Connect a motor to one of the Ports with a letter (e.g., Port C).

Run Single Motor for Time
Let’s run the motor for 2 seconds.

Copy this code to the Programming Canvas.
Play the program and watch the motor.
from spike import Motor
# Initialize the motor
motor = Motor('C')
# Rotate clockwise for 2 seconds at 75% speed
motor.run_for_seconds(2.0, 75)
Modify your code to change the speed of the motor and the duration of its motion. For Example:
# Rotate counterclockwise for 6.5 seconds at 30% speed
motor.run_for_seconds(6.5, -30)
Run Single Motor for Degrees
Let’s run the motor 360 degrees.

Copy the code below to the Programming Canvas
Play the program and watch the motor.
from spike import Motor
# Initialize the motor
motor = Motor('C')
# Rotate the motor 360 degrees clockwise
motor.run_for_degrees(360)
Modify your code to change the direction of the motor, using degrees of rotation. For Example:
# Run the motor 360 degrees clockwise, at 30% speed
motor.run_for_degrees(-360, 30)
Run Single Motor to Position


Let’s bring the motor to the 0-degree position from whichever position it’s currently in. Its position is indicated by the marker on the motor.

Copy this code to the Programming Canvas.
Play the program and watch the motor.
from spike import Motor
# Initialize the motor
motor = Motor('C')
# Place the motor in position “0,” aligning the markers
motor.run_to_position(0, 'shortest path', 75)
Change your code to make the motor stop in different positions.
# Run the motor to different positions, at different speeds
wait_for_seconds(1)
motor.run_to_position(0, 'shortest path', 30)
wait_for_seconds(1)
motor.run_to_position(90, 'clockwise', 100)
Challenge
Create a short program to run 2 motors according to a beat, something like both motors in one direction, both in the other direction, one motor in opposite direction of the other, and more!

Use the functions you’ve learned so far.

Example 3: Using the Force Sensor
What You’ll Need
Connect a Force Sensor to Port B and a motor to Port C.



Push, Start, Stop
Let’s use the Force Sensor to control the motor.

Copy this code to the Programming Canvas.
Play the program and press on the button on the Force Sensor.
from spike import ForceSensor, Motor
# Initialize the Force Sensor and a motor
force_sensor = ForceSensor('B')
motor = Motor('C')
# Press the button slowly, it will work only once
# Play the program again to try it again
motor.set_default_speed(25)
force_sensor.wait_until_pressed()
motor.start()
force_sensor.wait_until_released()
motor.stop()
Change your code to explore another interaction with the sensor.
motor.set_default_speed(25)
force_sensor.wait_until_pressed()
force_sensor.wait_until_released()
motor.start()
force_sensor.wait_until_pressed()
force_sensor.wait_until_released()
motor.stop()
Example 4: Changing the Flow with Loops & Conditions
What You’ll Need
With a Force Sensor connected to Port B and a motor on Port C, let’s explore ways of changing the execution flow of the program.

While Loop
The while loop is a structure used to repeat something. It’s used with a condition. The loop will repeat itself until the condition is false.



To indicate what goes in the body of the loop, you must indent the text. An example is shown below.

Copy this code to the Programming Canvas.
Play the program and press on the button on the Force Sensor.
from spike import ForceSensor, Motor
# Initialize the Force Sensor, a motor, and a variable
force_sensor = ForceSensor('B')
motor = Motor('C')
count = 0
# You can press 5 times on the Force Sensor 
motor.set_default_speed(25)
while count < 5:
	force_sensor.wait_until_pressed()
	motor.start()
	force_sensor.wait_until_released()
	motor.stop()
	count = count + 1
Change your code to explore another interaction with the sensor.
# This condition will always be true, so it will loop forever
while True:
	# Measure the force in newtons or as a percentage
	percentage = force_sensor.get_force_percentage()
	# Use the measured force to start the motor
	motor.start(percentage)
Example 5: Using the Color Sensor
What You’ll Need


Connect a Color Sensor to Port F and 2 motors to Ports A and E.

Yellow or violet?
Let’s use the Color Sensor to control the motors.

Copy this code to the Programming Canvas.
Play the program. Present a violet brick or a yellow brick to the Color Sensor, then watch the motors.
from spike import ColorSensor, Motor
from spike.control import Timer
# Initialize the Color Sensor, 2 motors, and a timer
color_sensor = ColorSensor('F')
motor_a = Motor('A')
motor_e = Motor('E')
timer = Timer()
# Present each colored brick to the Color Sensor and observe what happens; it will detect colors for 30 seconds
while timer.now() < 30:
	color = color_sensor.wait_for_new_color()
	if color == 'violet':
		motor_a.run_for_rotations(1)
	elif color == 'yellow':
		motor_e.run_for_rotations(1)
Change your code to explore another interaction with the sensor.
# This will use the reflected value of the colors to set the speed of the motor (yellow is approximately 80% and violet 60%)
while True:
	color = color_sensor.wait_for_new_color()
	percentage = color_sensor.get_reflected_light()
	if color == 'magenta':
		motor_a.run_for_rotations(1, percentage)
	elif color == 'yellow':
		motor_e.run_for_rotations(1, percentage)
Example 6: Using the Distance Sensor
What You’ll Need


Connect a Distance Sensor to Port D and a motor to Port C.

Closer or Farther
Let’s use the Distance Sensor to control the motor.

Copy this code to the Programming Canvas.
Play the program and wave your hand over the Distance Sensor.
from spike import DistanceSensor, Motor
# Initialize the Distance Sensor and motor
distance_sensor = DistanceSensor('D')
motor = Motor('C')
# Move your hand slowly toward and away from the Distance Sensor
while True:
	distance_sensor.wait_for_distance_farther_than(20, 'cm')
	motor.start()
	distance_sensor.wait_for_distance_closer_than(20, 'cm')
	motor.stop()
Change your code to explore another interaction with the sensor.
# Move your hand slowly toward and away from the Distance Sensor, the motor speed will change based on the distance detected 
while True:
	percentage = distance_sensor.get_distance_percentage()
	if percentage is not None:
		motor.start(100 - percentage)
Example 7: Using The Motion Sensor
What You’ll Need


You’ll only need the Hub, which you’ll hold and tilt.

Detect the Position
Let’s control the Light Matrix using the Hub’s Motion Sensor.

Copy this code to the Programming Canvas.
Play the program and tilt the Hub left and right.
from spike import PrimeHub, App
# Initialize the Hub and the app
hub = PrimeHub()
app = App()

while True:
	orientation = hub.motion_sensor.wait_for_new_orientation()
	if orientation == 'front':
		hub.light_matrix.show_image('ASLEEP')
		app.start_sound('Snoring')
	elif orientation == 'up':
		hub.light_matrix.show_image('HAPPY')
		app.start_sound('Triumph')
Change your code to explore another interaction with the sensor.
while True:
	angle = abs(hub.motion_sensor.get_pitch_angle()) * 2
	hub.light_matrix.show_image('HAPPY', angle)
Challenge
Use sensors to create a musical instrument that can modulate different sounds.

Example 8: Driving
What You’ll Need


You’ll need a Driving Base. You can build the model any way you like, but the simplest option is to attach 2 motors to the Hub, facing in opposite directions. Connect some wheels, and you’re ready to go!

Move Forward-Backward
Let’s program your Driving Base to move in straight lines.

Copy this code to the Programming Canvas.
Play the program! Make sure you have enough space for your Driving Base to move.
from spike import MotorPair
# Initialize the motor pair
motor_pair = MotorPair('E', 'F')
# Initialize default speed
motor_pair.set_default_speed(50)
# Move in one direction for 2 seconds
motor_pair.move(2, 'seconds')
Use this code to change your Driving Base’s movement.
# Move in the other direction for 2 seconds
motor_pair.set_default_speed(-50)
motor_pair.move(2, 'seconds')
Rotate a Driving Base (Point Turn)
Going straight but need to turn? Let’s try what’s called a “point turn.” It will turn the Driving Base on a single point.

Copy this code to the Programming Canvas.
Play the program! Make sure you have enough space for your Driving Base to move.
from spike import MotorPair
# Initialize the motor pair
motor_pair = MotorPair('E', 'F')
# Turn in one direction for 2 seconds
motor_pair.move_tank(10, 'cm', left_speed=25, right_speed=75)
Use this code to change your Driving Base’s movement.
# Move in the other direction for 2 seconds
motor_pair.move_tank(1, 'rotations', left_speed=-50, right_speed=50)
Challenge
Here’s a classic! Program your Driving Base to drive in a square using the functions you’ve just tried.

More Python Basics
As a text-based programming language, Python is based on some principles that are worth further explanation.

Flow Execution
If/Else
While Loop
Data Types
Class, Objects, Methods, Proprieties
Flow Execution
Remember that Python code is executed line-by-line. This is called the “flow of the execution.”



There are many ways to modify that flow. For example, you can always pause the execution of the program by using the command wait_for_seconds(1) (the number specified in the ( ) is given in seconds). It will have this effect on the flow of execution:



If/Else
“If/else” structures allow you to modify the program’s flow of execution. Effective use of the “if/else” structure is dependent on the ability to write and use good conditional statements. The program will check if the condition is true. If so, it will execute the commands placed within the "if" structure. If not, it will execute the commands placed within the "else" structure.



To indicate what goes in the body of the condition, you must indent the text.

While Loop
The while loop is a structure used to repeat something. It’s used with a condition. The loop will repeat itself until the condition is false.



In Python, we often use the While true: structure, which means that we repeat actions indefinitely because the condition is always true.

To indicate what goes in the body of the loop, you must indent the text.

Data Types
When using a text-based programming language, you’ll have to experiment with different types of values. In the beginning, you’ll mostly use numbers, strings, and lists.

Numbers (integers): positive or negative whole number, including 0
my_integer = 7
print(my_integer)
Numbers (float): a number with decimals
my_float = 7.0
print(my_float)
Strings (text): any characters
my_string = 'Hello World'
print(my_string)
Lists: multiple values bundled together, with each value accessible via an index The index starts at a value of “0.”
mylist = [1,2,3]
print(mylist[1])
Class, Objects, Methods, Proprieties
Python is an object-oriented programming language.

Here’s how it works:

In the SPIKE library, we’ve defined the electronic components that you’re able program. These have been grouped into classes. An example of this is the Hub Class, which defines everything you can do with the Hub.

from spike import PrimeHub
To use a class, you have to make a copy of it. The action of making a copy is referred to as “making an Object.” It’s done by initializing a component:

my_own_hub_object = PrimeHub()
Now that you’ve made a copy (i.e., object ) of a class, you can do lots of “things “with it. These “things” are referred to as methods, and sometimes as functions. Methods sometimes have parameters, and sometimes they don’t. For Example

# The method show_image() has a parameter called happy
my_own_hub_object.light_matrix.show_image('HAPPY')
# The method stop() has no parameter
motor.stop()
Common SPIKE Python Commands
These are the most common SPIKE Python commands.

1. Beep Sound
hub.speaker.beep(60, 0.2)
2. Play Sound
app.play_sound('Cat Meow 1')
3. Light Matrix
hub.light_matrix.show_image('HAPPY')
wait_for_seconds(2)
4. Single Motor On for Seconds
motor = Motor('A')
motor.run_for_seconds(1, 75)
5. Multiple Motor On for Degrees
motor_a = Motor('A')
motor_e = Motor('E')
motor_a.run_for_rotation(1, 75)
motor_e.run_for_rotation(1, 75)
6. Drive In Straight Line (Driving Base)
motor_pair = MotorPair('E', 'F')
motor_pair.move(10, 'cm')
7. Wait for 2 Seconds
wait_for_seconds(2)
8. Wait for Force Sensor
force_sensor.wait_until_pressed()
9. Repeat 10 Times
count = 0
while (count < 10):
	count = count + 1
	hub.light_matrix.write(count)
10. If... Else
color_sensor = ColorSensor('A')
while True:
	color = color_sensor.wait_for_new_color()
	if color == 'yellow':
		print('Yellow')
	else:
		print('Not Yellow')
11. A Program Example
from spike import PrimeHub, MotorPair
from spike.control import wait_for_seconds

hub = PrimeHub()
motor_pair = MotorPair('F', 'C')
motor_pair.set_default_speed(50)

# 3
hub.light_matrix.off()
hub.light_matrix.set_pixel(1, 0)
hub.light_matrix.set_pixel(2, 0)
hub.light_matrix.set_pixel(3, 0)
hub.light_matrix.set_pixel(3, 1)
hub.light_matrix.set_pixel(1, 2)
hub.light_matrix.set_pixel(2, 2)
hub.light_matrix.set_pixel(3, 2)
hub.light_matrix.set_pixel(3, 3)
hub.light_matrix.set_pixel(1, 4)
hub.light_matrix.set_pixel(2, 4)
hub.light_matrix.set_pixel(3, 4)

wait_for_seconds(1)

# 2
hub.light_matrix.off()
hub.light_matrix.set_pixel(1, 0)
hub.light_matrix.set_pixel(2, 0)
hub.light_matrix.set_pixel(3, 0)
hub.light_matrix.set_pixel(3, 1)
hub.light_matrix.set_pixel(1, 2)
hub.light_matrix.set_pixel(2, 2)
hub.light_matrix.set_pixel(3, 2)
hub.light_matrix.set_pixel(1, 3)
hub.light_matrix.set_pixel(1, 4)
hub.light_matrix.set_pixel(2, 4)
hub.light_matrix.set_pixel(3, 4)

wait_for_seconds(1)

# 1
hub.light_matrix.off()
hub.light_matrix.set_pixel(2, 0)
hub.light_matrix.set_pixel(1, 1)
hub.light_matrix.set_pixel(2, 1)
hub.light_matrix.set_pixel(2, 2)
hub.light_matrix.set_pixel(2, 3)
hub.light_matrix.set_pixel(1, 4)
hub.light_matrix.set_pixel(2, 4)
hub.light_matrix.set_pixel(3, 4)

wait_for_seconds(1)
motor_pair.move(10, 'seconds')
App Back to Top
To be able to use the App, you must initialize it.

Example
from spike import App

# Initialize the App.
app = App()
Following are all of the functions linked to the programmable elements of the SPIKE App.

play_sound()
play_sound(name, volume=100)
Plays a sound from the device (tablet or computer).

The program will not continue until the sound has finished playing.

If no sound is found with the given name is found, nothing will happen.

Parameters
name
The name of the sound to play.
Type	string (text)
Values	
Alert, Applause1, Applause2, Applause3, Baa, Bang1, Bang2, BasketballBounce, BigBoing, Bird, Bite, BoatHorn1, BoatHorn2, Bonk, BoomCloud, BoopBingBop, BowlingStrike, Burp1, Burp2, Burp3, CarAccelerate1, CarAccelerating2, CarHorn, CarIdle, CarReverse, CarSkid1, CarSkid2, CarVroom, CatAngry, CatHappy, CatHiss, CatMeow1, CatMeow2, CatMeow3, CatPurring, CatWhining, Chatter, Chirp, Clang, ClockTicking, ClownHonk1, ClownHonk2, ClownHonk3, Coin, Collect, Connect, Crank, CrazyLaugh, Croak, CrowdGasp, Crunch, Cuckoo, CymbalCrash, Disconnect, DogBark1, DogBark2, DogBark3, DogWhining1, DogWhining2, Doorbell1, Doorbell2, Doorbell3, DoorClosing, DoorCreek1, DoorCreek2, DoorHandle, DoorKnock, DoorSlam1, DoorSlam2, DrumRoll, DunDunDunnn, EmotionalPiano, Fart1, Fart2, Fart3, Footsteps, Gallop, GlassBreaking, Glug, GoalCheer, Gong, Growl, Grunt, HammerHit, HeadShake, HighWhoosh, Jump, JungleFrogs, Laser1, Laser2, Laser3, LaughingBaby1, LaughingBaby2, LaughingBoy, LaughingCrowd1, LaughingCrowd2, LaughingGirl, LaughingMale, Lose, LowBoing, LowSqueak, LowWhoosh, MagicSpell, MaleJump1, MaleJump2, Moo, OceanWave, Oops, OrchestraTuning, PartyBlower, Pew, PingPongHit, PlaingFlyingBy, PlaneMotorRunning, PlaneStarting, Pluck, PoliceSiren1, PoliceSiren2, PoliceSiren3, Punch, Rain, Ricochet, Rimshot, RingTone, Rip, Robot1, Robot2, Robot3, RocketExplosionRumble, Rooster, ScramblingFeet, Screech, Seagulls, ServiceAnnouncement, SewingMachine, ShipBell, SirenWhistle, Skid, SlideWhistle1, SlideWhistle2, SneakerSqueak, Snoring, Snort, SpaceAmbience, SpaceFlyby, SpaceNoise, Splash, SportWhistle1, SportWhistle2, SqueakyToy, SquishPop, SuctionCup, Tada, TelephoneRing2, TelephoneRing, Teleport2, Teleport3, Teleport, TennisHit, ThunderStorm, TolietFlush, ToyHonk, ToyZing, Traffic, TrainBreaks, TrainHorn1, TrainHorn2, TrainHorn3, TrainOnTracks, TrainSignal1, TrainSignal2, TrainStart, TrainWhistle, Triumph, TropicalBirds, Wand, WaterDrop, WhistleThump, Whiz1, Whiz2, WindowBreaks, Win, Wobble, WoodTap, Zip
Default	no default value
volume
The volume at which the sound will be played.
Type	integer (positive or negative whole number, including 0)
Values	0 to 100 %
Default	100%
Errors
TypeError: name is not a string or volume is not an integer.

RuntimeError: The SPIKE App has been disconnected from the Hub.

Example
from spike import App

app = App()

app.play_sound('Cat Meow 1')
start_sound()
start_sound(name, volume=100)
Starts playing a sound from your device (tablet or computer).

The program will not wait for the sound to finish playing before proceeding to the next command.

If no sound with the given name is found, nothing will happen.

Parameters
name
The name of the sound to play.
Type	string (text)
Values	
Alert, Applause1, Applause2, Applause3, Baa, Bang1, Bang2, BasketballBounce, BigBoing, Bird, Bite, BoatHorn1, BoatHorn2, Bonk, BoomCloud, BoopBingBop, BowlingStrike, Burp1, Burp2, Burp3, CarAccelerate1, CarAccelerating2, CarHorn, CarIdle, CarReverse, CarSkid1, CarSkid2, CarVroom, CatAngry, CatHappy, CatHiss, CatMeow1, CatMeow2, CatMeow3, CatPurring, CatWhining, Chatter, Chirp, Clang, ClockTicking, ClownHonk1, ClownHonk2, ClownHonk3, Coin, Collect, Connect, Crank, CrazyLaugh, Croak, CrowdGasp, Crunch, Cuckoo, CymbalCrash, Disconnect, DogBark1, DogBark2, DogBark3, DogWhining1, DogWhining2, Doorbell1, Doorbell2, Doorbell3, DoorClosing, DoorCreek1, DoorCreek2, DoorHandle, DoorKnock, DoorSlam1, DoorSlam2, DrumRoll, DunDunDunnn, EmotionalPiano, Fart1, Fart2, Fart3, Footsteps, Gallop, GlassBreaking, Glug, GoalCheer, Gong, Growl, Grunt, HammerHit, HeadShake, HighWhoosh, Jump, JungleFrogs, Laser1, Laser2, Laser3, LaughingBaby1, LaughingBaby2, LaughingBoy, LaughingCrowd1, LaughingCrowd2, LaughingGirl, LaughingMale, Lose, LowBoing, LowSqueak, LowWhoosh, MagicSpell, MaleJump1, MaleJump2, Moo, OceanWave, Oops, OrchestraTuning, PartyBlower, Pew, PingPongHit, PlaingFlyingBy, PlaneMotorRunning, PlaneStarting, Pluck, PoliceSiren1, PoliceSiren2, PoliceSiren3, Punch, Rain, Ricochet, Rimshot, RingTone, Rip, Robot1, Robot2, Robot3, RocketExplosionRumble, Rooster, ScramblingFeet, Screech, Seagulls, ServiceAnnouncement, SewingMachine, ShipBell, SirenWhistle, Skid, SlideWhistle1, SlideWhistle2, SneakerSqueak, Snoring, Snort, SpaceAmbience, SpaceFlyby, SpaceNoise, Splash, SportWhistle1, SportWhistle2, SqueakyToy, SquishPop, SuctionCup, Tada, TelephoneRing2, TelephoneRing, Teleport2, Teleport3, Teleport, TennisHit, ThunderStorm, TolietFlush, ToyHonk, ToyZing, Traffic, TrainBreaks, TrainHorn1, TrainHorn2, TrainHorn3, TrainOnTracks, TrainSignal1, TrainSignal2, TrainStart, TrainWhistle, Triumph, TropicalBirds, Wand, WaterDrop, WhistleThump, Whiz1, Whiz2, WindowBreaks, Win, Wobble, WoodTap, Zip
Default	no default value
volume
The volume at which the sound will be played
Type	integer (positive or negative whole number, including 0)
Values	0 to 100 %
Default	100%
Errors
TypeError: name is not a string or volume is not an integer.

RuntimeError: The SPIKE App has been disconnected from the Hub.

Example
from spike import App

app = App()

app.start_sound('Cat Meow 1')
Buttons Back to Top
Following are all of the functions linked to the programmable buttons (i.e., the Left Button, and the Right Button) on the SPIKE Prime Hub.

Events
wait_until_pressed()
Waits until the button is pressed.

Example
from spike import PrimeHub

hub = PrimeHub()

# beep every time the Left Button is pressed
while True:
    hub.left_button.wait_until_pressed()
    hub.speaker.start_beep()
    hub.left_button.wait_until_released()
    hub.speaker.stop()
wait_until_released()
Waits until the button is released.

Example
from spike import PrimeHub

hub = PrimeHub()

# beep every time the button is pressed
while True:
    hub.left_button.wait_until_pressed()
    hub.speaker.start_beep()
    hub.left_button.wait_until_released()
    hub.speaker.stop()
was_pressed()
Tests to see whether the button has been pressed since the last time this method called.

Once this method returns True, the button must be released and pressed again before this method will return True again.

Returns
True if the button was pressed, otherwise False
Type	boolean
Values	True or False
Example
from spike import PrimeHub
from spike.control import wait_for_seconds

hub = PrimeHub()

while True:
    wait_for_seconds(5)
    if hub.left_button.was_pressed():
        # do something
Measurements
is_pressed()
Tests whether the button is pressed.

Returns
True if the button is pressed, otherwise False
Type	boolean
Values	True or False
Example
from spike import PrimeHub

hub = PrimeHub()

if hub.left_button.is_pressed():
    # do something
Color Sensor Back to Top
To be able to use the Color Sensor, you must initialize it.

Example
from spike import ColorSensor

# Initialize the Color Sensor
color = ColorSensor('E')
Following are all of the functions linked to the Color Sensor.

Measurements
get_color()
Retrieves the detected color of a surface.

Returns
Name of the color.
Type	string (text)
Values	
'black', 'violet', 'blue', 'cyan', 'green', 'yellow', 'red', 'white', None
Errors
RuntimeError: The sensor has been disconnected from the Port.

Example
from spike import ColorSensor

# Initialize the Color Sensor.
paper_scanner = ColorSensor('E')

# Measure the color.
color = paper_scanner.get_color()

# Print the color name to the console
print('Detected:', color)

# Check if it is a specific color
if color == 'red':
    print('It is red!')
get_ambient_light()
Retrieves the intensity of the ambient light.

This causes the Color Sensor to change modes, which can affect your program in unexpected ways. For example, when the Color Sensor is in ambient light mode, it cannot read colors.

Returns
The ambient light intensity.
Type	integer (positive or negative whole number, including 0)
Values	0 to 100 %
Errors
RuntimeError: The sensor has been disconnected from the Port.

get_reflected_light()
Retrieves the intensity of the reflected light.

Returns
The reflected light intensity.
Type	integer (positive or negative whole number, including 0)
Values	0 to 100 %
Errors
RuntimeError: The sensor has been disconnected from the Port.

get_rgb_intensity()
Retrieves the red, green, blue, and overall color intensity.

Returns
Type	tuple of int
Values	Red, green, blue, and overall intensity (0-1024)
Errors
RuntimeError: The sensor has been disconnected from the Port.

get_red()
Retrieves the red color intensity.

Returns
Type	integer (positive or negative whole number, including 0)
Values	0 to 1024
Errors
RuntimeError: The sensor has been disconnected from the Port.

get_green()
Retrieves the green color intensity.

Returns
Type	integer (positive or negative whole number, including 0)
Values	0 to 1024
Errors
RuntimeError: The sensor has been disconnected from the Port.

get_blue()
Retrieves the blue color intensity.

Returns
Type	integer (positive or negative whole number, including 0)
Values	0 to 1024
Errors
RuntimeError: The sensor has been disconnected from the Port.

Events
wait_until_color()
wait_until_color(color)
Waits until the Color Sensor detects the specified color.

Parameters
The name of the color

color
Type	string (text)
Values	
'black', 'violet', 'blue', 'cyan', 'green', 'yellow', 'red', 'white', None
Default	no default value
Errors
TypeError: color is not a string or None.

ValueError: color is not one of the allowed values.

RuntimeError: The sensor has been disconnected from the Port.

Example
from spike import ColorSensor

color_sensor = ColorSensor('A')

color_sensor.wait_until_color('blue')

# Add actions after this
wait_for_new_color()
Waits until the Color Sensor detects a new color.

The first time this method is called, it returns immediately the detected color. After that, it waits until the Color Sensor detects a color that is different from the color that was detected the last time this method was used.

Returns
The name of the new color
Type	string (text)
Values	
'black', 'violet', 'blue', 'cyan', 'green', 'yellow', 'red', 'white', None
Errors
RuntimeError: The sensor has been disconnected from the Port.

Example
from spike import ColorSensor

color_sensor = ColorSensor('A')

while True:
    color = color_sensor.wait_for_new_color()
    if color == 'black':
        # For example, steer left
    elif color == 'white':
        # For example, steer right
Actions
light_up_all()
light_up_all(brightness=100)
Lights up all of the lights on the Color Sensor with a specified brightness.

This causes the Color Sensor to change modes, which can affect your program in unexpected ways. For example, when the Color Sensor is in light up mode, it cannot read colors.

Parameters
brightness
The desired brightness of the lights on the Color Sensor.
Type	integer (positive or negative whole number, including 0)
Values	0 to 100 % (0 is off and 100 is full brightness.)
Default	100 %
Errors
TypeError: brightness is not an integer.

RuntimeError: The sensor has been disconnected from the Port.

Example
from spike import ColorSensor

color_sensor = ColorSensor('A')

# Turn the lights of the Color Sensor on
color_sensor.light_up_all()

# Turn the lights ot the Color Sensor off
color_sensor.light_up_all(0)
light_up()
light_up(light_1, light_2, light_3)
Sets the brightness of the individual lights on the Color Sensor.

This causes the Color Sensor to change modes, which can affect your program in unexpected ways. For example, when the Color Sensor is in light up mode, it cannot read colors.

Parameters
light_1
The desired brightness of light 1.
Type	integer (positive or negative whole number, including 0)
Values	0 to 100 % (0 is off and 100 is full brightness.)
Default	100 %
light_2
The desired brightness of light 2.
Type	integer (positive or negative whole number, including 0)
Values	0 to 100 % (0 is off and 100 is full brightness.)
Default	100 %
light_3
The desired brightness of light 3.
Type	integer (positive or negative whole number, including 0)
Values	0 to 100 % (0 is off and 100 is full brightness.)
Default	100 %
Errors
TypeError: light_1, light_2, or light_3 is not an integer.

RuntimeError: The sensor has been disconnected from the Port.

Example
from spike import ColorSensor

color_sensor = ColorSensor('A')

# Turn on one light (light_2) on the Color Sensor at full brightness
color_sensor.light_up(0, 100, 0)
Distance Sensor Back to Top
To be able to use the Distance Sensor, you must initialize it.

Example
from spike import DistanceSensor

# Initialize the Distance Sensor.
distance = DistanceSensor('A')
Following are all of the functions linked to the Distance Sensor.

Actions
light_up_all()
light_up_all(brightness=100)
Lights up all of the lights on the Distance Sensor with the specified brightness.

Parameters
brightness
The specified brightness of all the lights.
Type	integer (positive or negative whole number, including 0)
Values	0 to 100% (0 is off and 100 is full brightness.)
Default	100
Errors
TypeError: brightness is not a number.

RuntimeError: The sensor has been disconnected from the Port.

Example
from spike import DistanceSensor

distance_sensor = DistanceSensor('A')

# Turn the lights on
distance_sensor.light_up_all()

# Turn the lights off
distance_sensor.light_up_all(0)
light_up()
light_up(right_top, left_top, right_bottom, left_bottom)
Sets the brightness of the individual lights on the Distance Sensor.

Parameters
right_top
The brightness of the light above the right part of the Distance Sensor.
Type	integer (positive or negative whole number, including 0)
Values	0 to 100% (0 is off and 100 is full brightness.)
Default	100
left_top
The brightness of the light above the left part of the Distance Sensor.
Type	integer (positive or negative whole number, including 0)
Values	0 to 100% (0 is off and 100 is full brightness.)
Default	100
right_bottom
The brightness of the light below the right part of the Distance Sensor.
Type	integer (positive or negative whole number, including 0)
Values	0 to 100% (0 is off and 100 is full brightness.)
Default	100
left_bottom
The brightness of the light below the left part of the Distance Sensor.
Type	integer (positive or negative whole number, including 0)
Values	0 to 100% (0 is off and 100 is full brightness.)
Default	100
Errors
TypeError: right_top, left_top, right_bottom or left_bottom is not a number.

RuntimeError: The sensor has been disconnected from the Port.

Example
from spike import DistanceSensor

distance_sensor = DistanceSensor('A')

# Turn on the top lights of the Distance Sensor
distance_sensor.light_up(100, 100, 0, 0)
Measurements
get_distance_cm()
get_distance_cm(short_range=False)
Retrieves the measured distance in centimeters.

Parameters
short_range
Whether to use or not the short range mode. The short range mode increases accuracy but it can only detect nearby objects.
Type	boolean
Values	True or False
Default	False
Returns
The measured distance, or “none” if the distance cannot be measured.
Type	float (decimal number)
Values	0 to 200 cm
Errors
TypeError: short_range is not a boolean.

RuntimeError: The sensor has been disconnected from the Port.

Example
from spike import DistanceSensor

# Initialize the Distance Sensor.
wall_detector = DistanceSensor('E')

# Measure the distances between the Distance Sensor and and object in centimeters or inches.
dist_cm = wall_detector.get_distance_cm()
dist_inches = wall_detector.get_distance_inches()

# Print both results to the console
print('cm:', dist_cm, 'Inches:', dist_inches)
get_distance_inches()
get_distance_inches(short_range=False)
Gets the measured distance in inches.

Parameters
short_range
Whether or not to use short range mode. Short range mode increases accuracy but it can only detect nearby objects.
Type	boolean
Values	True or False
Default	False
Returns
The measured distance, or “none” if the distance cannot be measured.
Type	float (decimal number)
Values	any value between 0 and 79
Errors
TypeError: short_range is not a boolean.

RuntimeError: The sensor has been disconnected from the Port.

get_distance_percentage()
get_distance_percentage(short_range=False)
Retrieves the measured distance in percent.

Parameters
short_range
Whether or not to use short range mode. Short range mode increases accuracy but it can only detect nearby objects.
Type	boolean
Values	True or False
Default	False
Returns
The measured distance, or “none” if the distance cannot be measured.
Type	integer (positive or negative whole number, including 0)
Values	any value between 0 and 100
Errors
TypeError: short_range is not a boolean.

RuntimeError: The sensor has been disconnected from the Port.

Events
wait_for_distance_farther_than()
wait_for_distance_farther_than(distance, unit='cm', short_range=False)
Waits until the measured distance is greater than distance.

Parameters
distance
The target distance to detect, from the sensor to an object.
Type	float (decimal number)
Values	any value
Default	no default value
unit
Unit of measurement of the distance.
Type	string (text)
Values	
'cm', 'in', '%'
Default	cm
short_range
Whether or not to use short range mode. Short range mode increases accuracy but it can only detect nearby objects.
Type	boolean
Values	True or False
Default	False
Errors
TypeError: distance is not a number or unit is not a string or short_range is not a boolean.

ValueError: unit is not one of the allowed values.

RuntimeError: The sensor has been disconnected from the Port.

Example
from spike import DistanceSensor

distance_sensor = DistanceSensor('A')

while True:
    distance_sensor.wait_for_distance_farther_than(20, 'cm')
    # do something, for Example, start a motor
    distance_sensor.wait_for_distance_closer_than(20, 'cm')
    # do something, for Example, stop a motor
wait_for_distance_closer_than()
wait_for_distance_closer_than(distance, unit='cm', short_range=False)
Waits until the measured distance is less than distance.

Parameters
distance
The target distance to detect, from the sensor to an object.
Type	float (decimal number)
Values	any value
Default	no default value
unit
Unit of measurement of the distance.
Type	string (text)
Values	
'cm', 'in', '%'
Default	cm
short_range
Whether or not to use short range mode. Short range mode increases accuracy but it can only detect nearby objects.
Type	boolean
Values	True or False
Default	False
Errors
TypeError: distance is not a number or unit is not a string or short_range is not a boolean.

ValueError: unit is not one of the allowed values. short_range is not a boolean.

RuntimeError: The sensor has been disconnected from the Port.

Example
from spike import DistanceSensor

distance_sensor = DistanceSensor('A')

while True:
    distance_sensor.wait_for_distance_farther_than(20, 'cm')
    # do something, for Example, start a motor
    distance_sensor.wait_for_distance_closer_than(20, 'cm')
    # do something, for Example, stop a motor
Force Sensor Back to Top
To be able to use the Force Sensor, you must initialize it.

Example
from spike import ForceSensor

# Initialize the Force Sensor.
force = ForceSensor('E')
Following are all of the functions linked to the Force Sensor.

Measurements
is_pressed()
Tests whether the button on the sensor is pressed.

Returns
True if the button is pressed.
Type	boolean
Values	True or False
Errors
RuntimeError: The Force Sensor has been disconnected from the port.

Example
from spike import ForceSensor

# Initialize the Force Sensor.
door_bell = ForceSensor('E')

# Check if the Force Sensor is pressed
if door_bell.is_pressed():
    print('Hello!')
get_force_newton()
Retrieves the measured force, in newtons.

Returns
The measured force in newtons.
Type	float (decimal number)
Values	between 0 and 10
Errors
RuntimeError: The Force Sensor has been disconnected from the port.

Example
from spike import ForceSensor

# Initialize the Force Sensor.
door_bell = ForceSensor('E')

# Measure the force in newtons or as a percentage.
newtons = door_bell.get_force_newton()
percentage = door_bell.get_force_percentage()

# Print both results
print('N:', newtons, '=', percentage, '%')

# Check whether the Force Sensor is pressed
if door_bell.is_pressed():
    print('Hello!')
get_force_percentage()
Retrieves the measured force as a percentage of the maximum force.

Returns
The measured force, in percentage.
Type	integer (positive or negative whole number, including 0)
Values	between 0 - 100%.
Errors
RuntimeError: The Force Sensor has been disconnected from the port.

Events
wait_until_pressed()
Waits until the Force Sensor is pressed.

Errors
RuntimeError: The sensor has been disconnected from the port.

Example
from spike import ForceSensor

force_sensor = ForceSensor('A')

while True:
    force_sensor.wait_until_pressed()
    # do something, for Example, start a motor
    force_sensor.wait_until_released()
    # do something, for Example, stop a motor
wait_until_released()
Waits until the Force Sensor is released.

Errors
RuntimeError: The sensor has been disconnected from the Port.

Example
from spike import ForceSensor

force_sensor = ForceSensor('A')

while True:
    force_sensor.wait_until_pressed()
    # do something, for Example, start a motor
    force_sensor.wait_until_released()
    # do something, for Example, stop a motor
Light matrix Back to Top
Following are all of the functions linked to the Light Matrix on the SPIKE Prime Hub.

Actions
show_image()
show_image(image, brightness=100)
Shows an image on the Light Matrix.

Parameters
image
Name of the image.
Type	string (text)
Values	
ANGRY, ARROW_E, ARROW_N, ARROW_NE, ARROW_NW, ARROW_S, ARROW_SE, ARROW_SW, ARROW_W, ASLEEP, BUTTERFLY, CHESSBOARD, CLOCK1, CLOCK10, CLOCK11, CLOCK12, CLOCK2, CLOCK3, CLOCK4, CLOCK5, CLOCK6, CLOCK7, CLOCK8, CLOCK9, CONFUSED, COW, DIAMOND, DIAMOND_SMALL, DUCK, FABULOUS, GHOST, GIRAFFE, GO_RIGHT, GO_LEFT, GO_UP, GO_DOWN, HAPPY, HEART, HEART_SMALL, HOUSE, MEH, MUSIC_CROTCHET, MUSIC_QUAVER, MUSIC_QUAVERS, NO, PACMAN, PITCHFORK, RABBIT, ROLLERSKATE, SAD, SILLY, SKULL, SMILE, SNAKE, SQUARE, SQUARE_SMALL, STICKFIGURE, SURPRISED, SWORD, TARGET, TORTOISE, TRIANGLE, TRIANGLE_LEFT, TSHIRT, UMBRELLA, XMAS, YES
Default	no default value
brightness
Brightness of the image
Type	integer (positive or negative whole number, including 0)
Values	0 to 100%
Default	100
Errors
TypeError: image is not a string or brightness is not an integer.

ValueError: image is not one of the allowed values.

Example
from spike import PrimeHub
from spike.control import wait_for_seconds

hub = PrimeHub()

hub.light_matrix.show_image('HAPPY')
wait_for_seconds(5)
hub.light_matrix.show_image('ASLEEP')
wait_for_seconds(5)
set_pixel()
set_pixel(x, y, brightness=100)
Sets the brightness of one pixel (one of the 25 LED) on the Light Matrix.

Parameters
x
Pixel position, counting from the left.
Type	integer (positive or negative whole number, including 0)
Values	1 to 5
Default	no default value
y
Pixel position, counting from the top.
Type	integer (positive or negative whole number, including 0)
Values	1 to 5
Default	no default value
brightness
Brightness of the pixel
Type	integer (positive or negative whole number, including 0)
Values	0 to 100%
Default	100
Errors
TypeError: x, y or brightness is not an integer.

ValueError: x, y is not within the allowed range of 0-4.

Example
from spike import PrimeHub

hub = PrimeHub()

hub.light_matrix.set_pixel(1, 4)
write()
write(text)
Writes text on the Light Matrix, one letter at a time, scrolling from right to left.

Your program will not continue until all of the letters have been shown.

Parameters
text
Text to write.
Type	string (text)
Values	any text
Default	no default value
Example
from spike import PrimeHub

hub = PrimeHub()

hub.light_matrix.write('Hello!')

# Show the number 1 on the Light Matrix
hub.light_matrix.write('1')
off()
Turns off all the pixels on the Light Matrix.

Example
from spike import PrimeHub

hub = PrimeHub()

hub.light_matrix.off()
Mathematical Functions Back to Top
The math module provides some basic mathematical functions for working with floating-point numbers.

Functions
acos(x)
Returns: the inverse cosine of x.

acosh(x)
Returns: the inverse hyperbolic cosine of x.

asin(x)
Returns: the inverse sine of x.

asinh(x)
Returns: the inverse hyperbolic sine of x.

atan(x)
Returns: the inverse tangent of x.

atan2(y, x)
Returns: the principal value of the inverse tangent of y/x.

atanh(x)
Returns: the inverse hyperbolic tangent of x.

ceil(x)
Returns: an integer, being x rounded towards positive infinity.

copysign(x, y)
Returns: x with the sign of y.

cos(x)
Returns: the cosine of x.

cosh(x)
Returns: the hyperbolic cosine of x.

degrees(x)
Returns: radians x converted to degrees.

erf(x)
Returns: the error function of x.

erfc(x)
Returns: the complementary error function of x.

exp(x)
Returns: the exponential of x.

expm1(x)
Returns: exp(x) - 1.

fabs(x)
Returns: the absolute value of x.

floor(x)
Returns: an integer, being x rounded towards negative infinity.

fmod(x, y)
Returns: the remainder of x/y.

frexp(x)
Returns: Decomposes a floating-point number into its mantissa and exponent. The Returned value is the tuple (m, e) such that x == m * 2**e exactly. If x == 0 then the function Returns (0.0, 0), otherwise the relation 0.5 <= abs(m) < 1 holds.

gamma(x)
Returns: the gamma function of x.

isfinite(x)
Returns: True if x is finite.

isinf(x)
Returns: True if x is infinite.

isnan(x)
Returns: True if x is not-a-number

ldexp(x, exp)
Returns: x * (2**exp).

lgamma(x)
Returns: the natural logarithm of the gamma function of x.

log(x)
Returns: the natural logarithm of x.

log10(x)
Returns: the base-10 logarithm of x.

log2(x)
Returns: the base-2 logarithm of x.

modf(x)
Returns: a tuple of two floats, being the fractional and integral parts of x. Both Returned values have the same sign as x.

pow(x, y)
Returns: x to the power of y.

radians(x)
Returns: degrees x converted to radians.

sin(x)
Returns: the sine of x.

sinh(x)
Returns: the hyperbolic sine of x.

sqrt(x)
Returns: the square root of x.

tan(x)
Returns: the tangent of x.

tanh(x)
Returns: the hyperbolic tangent of x.

trunc(x)
Returns: an integer, being x rounded towards 0.

Constants
e
The mathematical constant e = 2.718281…, with available precision.

pi
The mathematical constant π = 3.141592…, to available precision.

Motion Sensor Back to Top
Following are all of the functions linked to the Motion Sensor, which combines a three-axis accelerometer and a three-axis gyroscope, on the Hub.

Events
was_gesture()
was_gesture(gesture)
Tests whether a gesture has occurred since the last time was_gesture() was used or since the beginning of the program (for the first use).

Parameters
gesture
The name of the gesture.
Type	string (text)
Values	
'shaken', 'tapped', 'doubletapped', 'falling', 'None'
Default	no default value
Errors
TypeError: gesture is not a string.

ValueError: gesture is not one of the allowed values.

Returns
True if gesture has occurred since the last time was_gesture() was called, otherwise False.
Type	boolean
Values	True or False
Example
from spike import PrimeHub
from spike.control import wait_for_seconds

hub = PrimeHub()

wait_for_seconds(5)
if hub.motion_sensor.was_gesture('shaken'):
    # the Hub was shaken some time within the last 5 seconds
wait_for_new_gesture()
Waits until a new gesture happens.

Returns
The new gesture.
Type	string (text)
Values	
'shaken', 'tapped', 'doubletapped', 'falling'
Example
from spike import PrimeHub

hub = PrimeHub()

gesture = hub.motion_sensor.wait_for_new_gesture()
if gesture == 'shaken':
    # do one thing
elif gesture == 'tapped':
    # do another thing
wait_for_new_orientation()
Waits until the orientation of the Hub changes.

The first time this method is called, it will immediately return the current value. After that, calling this method will block the program until the Hub’s orientation has changed since the previous time this method was called.

Returns
The Hub’s new orientation.
Type	string (text)
Values	
'front', 'back', 'up', 'down', 'leftside', 'rightside'
Example
from spike import PrimeHub

hub = PrimeHub()

orientation = hub.motion_sensor.wait_for_new_orientation()
if orientation == 'leftside':
    # do one thing
elif orientation == 'rightside':
    # do another thing
Measurements
get_orientation()
Retrieves the current orientation of the Hub.

Returns
The Hub’s current orientation.
Type	string (text)
Values	
'front', 'back', 'up', 'down', 'leftside', 'rightside'
Example
from spike import PrimeHub

hub = PrimeHub()

if hub.motion_sensor.get_orientation() == 'front':
    # do something
get_gesture()
Retrieves the most recently-detected gesture.

Returns
The gesture.
Type	string (text)
Values	
'shaken', 'tapped', 'doubletapped', 'falling'
Example
from spike import PrimeHub

hub = PrimeHub()

while True:
	if hub.motion_sensor.get_gesture() == 'falling':
		print("Aaah!")
get_roll_angle()
Retrieves the roll angle of the Hub.

“Roll” is the rotation around the front-back (longitudinal) axis. “Yaw” is the rotation around the front-back (vertical) axis. “Pitch” is the rotation around the left-right (transverse) axis.

Returns
The roll angle, specified in degrees.
Type	Integer (Positive or negative whole number, including 0)
Values	-180 to 180
Example
from spike import PrimeHub

hub = PrimeHub()

if hub.motion_sensor.get_roll_angle() > 90:
    # do something
get_pitch_angle()
Retrieves the pitch angle of the Hub.

“Pitch” is the rotation around the left-right (transverse) axis. “Roll” is the rotation around the front-back (longitudinal) axis. “Yaw” is the rotation around the front-back (vertical) axis.

Returns
The pitch angle, specified in degrees.
Type	Integer (Positive or negative whole number, including 0)
Values	-180 to 180
Example
from spike import PrimeHub

hub = PrimeHub()

if hub.motion_sensor.get_pitch_angle() > 90:
    # do something
get_yaw_angle()
Retrieves the yaw angle of the Hub.

“Yaw” is the rotation around the front-back (vertical) axis. “Pitch” the is rotation around the left-right (transverse) axis. “Roll” the is rotation around the front-back (longitudinal) axis.

Returns
The yaw angle, specified in degrees.
Type	Integer (Positive or negative whole number, including 0)
Values	-180 to 180
Example
from spike import PrimeHub

hub = PrimeHub()

if hub.motion_sensor.get_yaw_angle() > 90:
    # do something
Settings
reset_yaw_angle()
Sets the yaw angle to 0.

Example
from spike import PrimeHub

hub = PrimeHub()

hub.motion_sensor.reset_yaw_angle()
angle = hub.motion_sensor.get_yaw_angle()
print('Angle:', angle)

# Angle is now 0
Motor Pairs Back to Top
MotorPair objects are used to control two motors simultaneously in opposite directions.

To be able to use MotorPair, you must initialize the 2 motors.

Example
from spike import MotorPair

# If the left motor is connected to Port B
# And the right motor is connected to Port A.
motor_pair = MotorPair('B', 'A')
Actions
move()
move(amount, unit='cm', steering=0, speed=None)
Start the 2 motors simultaneously to move a Driving Base.

steering=0 makes the Driving Base go straight. Negative numbers make the Driving Base turn left. Positive numbers make the Driving Base turn right.

The program will not continue until amount is reached.

If the value of steering is equal to -100 or 100, the Driving Base will perform a rotation on itself (tank move) with the default speed on each motor.

If the value of steering is outside of the allowed range, the value will be set to -100 or 100 depending whether the value is positive or negative.

If speed is outside of the allowed range, the value will be set to -100 or 100 depending whether the value is positive or negative.

If the speed is negative, then the Driving Base will move backward instead of forward. Likewise, if amount is negative, the Driving Base will move backward instead of forward. If both the speed and the amount are negative, then the Driving Base will move forward.

When unit is 'cm' or 'in', the amount of the unit parameter is the horizontal distance that the Driving Base will travel before stopping. The relationship between motor rotations and distance traveled can be adjusted by calling set_motor_rotation().

When 'unit' is 'rotations' or 'degrees', the amount parameter value specifies how much the motor axle will turn before stopping.

When unit is 'seconds', the amount parameter value specifies the amount of time the motors will run before stopping.

Parameters
amount
The quantity to move in relation to the specified unit of measurement.
Type	float (decimal numbers)
Values	any value
Default	no default value
unit
The units of measurement of the amount parameter
Type	string (text)
Values	
'cm', 'in', 'rotations', 'degrees', 'seconds'
Default	cm
steering
The direction and the quantity to steer the Driving Base.
Type	integer (positive or negative whole number, including 0)
Values	100 to 100
Default	0
speed
The motor speed.
Type	integer (positive or negative whole number, including 0)
Values	-100 to 100
Default	the speed set by set_default_speed()
Errors
TypeError: amount is not a number, or steering or speed is not an integer, or unit is not a string.

ValueError: unit is not one of the allowed values.

RuntimeError: One or both of the motors has been disconnected or the motors could not be paired.

Example
import math
from spike import MotorPair

motor_pair = MotorPair('B', 'A')

# turn a Driving Base 180 degrees in place (if wheels are 8.1 cm apart)
motor_pair.move(8.1 * math.pi / 2, 'cm', steering=100)
start()
start(steering=0, speed=None)
Start the 2 motors simultaneously, to will move a Driving Base.

steering=0 makes the Driving Base go straight. Negative numbers make the Driving Base turn left. Positive numbers make the Driving Base turn right.

The program flow is not interrupted. This is most likely interrupted by a sensor input and a condition.

If the value of steering is equal to -100 or 100, the Driving Base will perform a rotation on itself (tank move) with the default speed on each motor.

If the value of steering is outside of the allowed range, the value will be set to -100 or 100 depending on whether the value is positive or negative.

If speed is outside of the allowed range, the value will be set to -100 or 100 depending whether the value is positive or negative.

If the speed is negative, then the Driving Base will move backward instead of forward. Likewise, if amount is negative, the Driving Base will move backward instead of forward. If both the speed and the amount are negative, then the Driving Base will move forward.

Parameters
steering
The direction and the quantity to steer the Driving Base.
Type	integer (positive or negative whole number, including 0)
Values	-100 to 100
Default	0
speed
The speed at which the Driving Base will move while performing a curve.
Type	integer (positive or negative whole number, including 0)
Values	-100 to 100 %
Default	if no value is specified, it will use the default speed set by set_default_speed().
Errors
TypeError: steering or speed is not an integer.

RuntimeError: One or both of the motors has been disconnected or the motors could not be paired.

Example
from spike import MotorPair

motor_pair = MotorPair('B', 'A')

motor_pair.start()
# wait for something...
motor_pair.stop()
stop()
Stops the 2 motors simultaneously, which will stop a Driving Base.

The motors will either actively hold their current position or coast freely depending on the option selected by set_stop_action().

Errors
RuntimeError: One or both of the motors has been disconnected or the motors could not be paired.

Example
from spike import MotorPair

motor_pair = MotorPair('B', 'A')

motor_pair.start()
# wait for something...
motor_pair.stop()
move_tank()
move_tank(amount, unit='cm', left_speed=None, right_speed=None)
Moves the Driving Base using differential (tank) steering.

The speed of each motor can be controlled independently for differential (tank) drive Driving Bases.

When unit is 'cm' or 'in', the amount of the unit parameter is the horizontal distance that the Driving Base will travel before stopping. The relationship between motor rotations and distance traveled can be adjusted by calling set_motor_rotation().

When 'unit' is 'rotations' or 'degrees', the amount parameter value specifies how much the motor axle will turn before stopping.

When unit is 'seconds', the amount parameter value specifies the amount of time the motors will run before stopping.

If left_speed or right_speed is outside of the allowed range, the value will be set to -100 or 100 depending whether the value is positive or negative.

If one of the speed is negative (left_speed or right_speed), then the motor with that negative speed will run backward instead of forward. If the value of the amount parameter is negative, both motors will rotate backward instead of forward. If both the speed values (left_speed or right_speed) are negative and the value of the amount parameter is negative, then the both motors will rotate forward.

The program will not continue until amount is reached.

Parameters
amount
The quantity to move in relation to the specified unit of measurement.
Type	float (decimal number)
Values	any value
Default	no default value
unit
The units of measurement of the amount parameter
Type	string (text)
Values	
'cm', 'in', 'rotations', 'degrees', 'seconds'
Default	cm
left_speed
The speed of the left motor
Type	integer (positive or negative whole number, including 0)
Values	-100 to 100
Default	the speed set by set_default_speed()
right_speed
The speed of the right motor
Type	integer (positive or negative whole number, including 0)
Values	-100 to 100
Default	the speed set by set_default_speed()
Errors
TypeError: amount, left_speed or right_speed is not a number or unit is not a string.

ValueError: unit is not one of the allowed values.

RuntimeError: One or both of the Ports do not have a motor connected or the motors could not be paired.

Example
from spike import MotorPair

motor_pair = MotorPair('B', 'A')
motor_pair.move_tank(10, 'cm', left_speed=25, right_speed=75)
start_tank()
start_tank(left_speed, right_speed)
Starts moving the Driving Base using differential (tank) steering.

The speed of each motor can be controlled independently for differential (tank) drive Driving Bases.

If left_speed or right_speed is outside of the allowed range, the value will be set to -100 or 100 depending whether the value is positive or negative.

If a speed is negative, then the motors will move backward instead of forward.

The program flow is not interrupted. This is most likely interrupted by a sensor input and a condition.

Parameters
left_speed
The speed of the left motor.
Type	integer (positive or negative whole number, including 0)
Values	-100 to 100
Default	no default value
right_speed
The speed of the right motor.
Type	integer (positive or negative whole number, including 0)
Values	-100 to 100
Default	no default value
Errors
TypeError: left_speed or right_speed is not an integer.

RuntimeError: One or both of the Ports do not have a motor connected or the motors could not be paired.

Example
from spike import MotorPair

motor_pair = MotorPair('B', 'A')

# Rotote the Driving Base in place to the right
motor_pair.start_tank(100, -100)
start_at_power()
start_at_power(power, steering=0)
Starts moving the Driving Base without speed control.

The motors can also be driven without speed control. This is useful when using your own control algorithm (e.g., a proportional line follower).

If steering is outside of the allowed range, the value will be set to -100 or 100 depending whether the value is positive or negative.

If power is outside of the allowed range, the value will be set to -100 or 100 depending whether the value is positive or negative.

If the power is negative, then Driving Base will move backward instead of forward.

The program flow is not interrupted. This can most likely interrupted by a sensor input and a condition.

Parameters
power
The amount of power to send to the motors.
Type	integer (positive or negative whole number, including 0)
Values	-100 to 100 %
Default	100
steering
The steering direction (-100 to 100). 0 makes the Driving Base go straight. Negative numbers make the Driving Base turn left. Positive numbers make the Driving Base turn right.
Type	Integer
Values	-100 to 100
Default	0
Errors
TypeError: steering or power is not an integer.

RuntimeError: One or both of the Ports do not have a motor connected or the motors could not be paired.

Example
from spike import MotorPair, ColorSensor

motor_pair = MotorPair('B', 'A')
color_sensor = ColorSensor('F')

while True:
    steering = color_sensor.get_reflected_light() - 50
    motor_pair.start_at_power(50, steering)
start_tank_at_power()
start_tank_at_power(left_power, right_power)
Starts moving the Driving Base using differential (tank) steering without speed control.

The motors can also be driven without speed control. This is useful when using your own control algorithm (e.g., a proportional line follower).

If left_power or right_power is outside of the allowed range, the value will be ronuded to -100 or 100 depending on whether the value is positive or negative.

If a power is negative, then the corresponding motor will move backward instead of forward.

The program flow is not interrupted. This can most likely interrupted by a sensor input and a condition.

Parameters
left_power
The power of the left motor
Type	Integer
Values	-100 to 100
Default	no default value
right_power
The power of the right motor
Type	Integer
Values	-100 to 100
Default	no default value
Errors
TypeError: left_power or right_power is not an integer.

RuntimeError: One or both of the Ports do not have a motor connected or the motors could not be paired.

Example
from spike import MotorPair

motor_pair = MotorPair('B', 'A')

# Rotate the Driving Base in place to the right
motor_pair.start_tank_at_power(100, -100)
Measurements
get_default_speed()
Retrieves the default motor speed.

Returns
The default motor speed.
Type	integer (positive or negative whole number, including 0)
Values	-100 to 100 %
Settings
set_motor_rotation()
set_motor_rotation(amount, unit='cm')
Sets the ratio of one motor rotation to the distance traveled.

If there are no gears used between the motors and the wheels of the Driving Base, then amount is the circumference of one wheel.

Calling this method does not affect the Driving Base if it is already currently running. It will only have an effect the next time one of the move or start methods is used.

Parameters
amount
The distance the Driving Base moves when both motors move one rotation each.
Type	float (decimal number)
Values	any value
Default	17.6
unit
The units of measurement of the amount parameter.
Type	string (text)
Values	
'cm', 'in'
Default	cm
Errors
TypeError: amount is not a number or unit is not a string.

ValueError: unit is not one of the allowed values.

Example
import math
from spike import MotorPair

motor_pair = MotorPair('B', 'A')

# The SPIKE Prime Wheels have a diameter of 17.6 cm. Multiplying by π gives the distance traveled (circumference)
motor_pair.set_motor_rotation(17.6 * math.pi, 'cm')
set_default_speed()
set_default_speed(speed)
Sets the default motor speed.

If speed is outside of the allowed range, the value will be set to -100 or 100 depending on whether the value is positive or negative.

Setting the speed will not have any effect until one of the move or start methods is called, even if the Driving Base is already moving.

Parameters
speed
The default motor speed
Type	integer (positive or negative whole number, including 0)
Values	-100 to 100
Default	100
Errors
TypeError: speed is not a number.

set_stop_action()
set_stop_action(action)
Sets the motor action that will be used when the Driving Base stops.

If action is 'brake' the motors will stop quickly but will be allowed to turn freely.

If action is 'hold', the motors will actively hold their current position and cannot be turned manually.

If action is set to 'coast', the motors will stop slowly and will be able to be turned freely.

Setting the stop action does not take immediate effect on the motors. The setting will be saved and used whenever stop() is called or when one of the move methods has completed without being interrupted.

Parameters
action
The desired action of the motors when the Driving Base stops.
Type	string (text)
Values	
'brake', 'hold', 'coast'
Default	'coast'
Errors
TypeError: action is not a string.

ValueError: action is not one of the allowed values.

Example
from spike import MotorPair

motor_pair = MotorPair('B', 'A')

# allow the motors to turn freely after stopping
motor_pair.set_stop_action('coast')
Operators Back to Top
greater_than()
greater_than(a, b)
Tests whether value a is greater than value b.

This is the same as a > b.

Parameters
a
Any object that can be compared to b.
Type	any type
Values	any value
Default	no default value
b
Any object that can be compared to a.
Type	any type
Values	any value
Default	no default value
Returns
Type	boolean
Values	True if a > b, otherwise False.
Example
from spike import ColorSensor
from spike.control import wait_until
from spike.operator import greater_than

color_sensor = ColorSensor('A')

wait_until(color_sensor.get_reflected_light, greater_than, 50)
greater_than_or_equal_to()
greater_than_or_equal_to(a, b)
Tests whether a is greater or equal to than b.

This is the same as a >= b.

Parameters
a
Any object that can be compared to b.
Type	any type
Values	any value
Default	no default value
b
Any object that can be compared to a.
Type	any type
Values	any value
Default	no default value
Returns
Type	boolean
Values	True if a >= b, otherwise False.
Example
from spike import ColorSensor
from spike.control import wait_until
from spike.operator import greater_than_or_equal_to

color_sensor = ColorSensor('A')

wait_until(color_sensor.get_reflected_light, greater_than_or_equal_to, 50)
less_than()
less_than(a, b)
Tests whether a is less than b.

This is the same as a < b.

Parameters
a
Any object that can be compared to b.
Type	any type
Values	any value
Default	no default value
b
Any object that can be compared to a.
Type	any type
Values	any value
Default	no default value
Returns
Type	boolean
Values	True if a < b, otherwise False.
Example
from spike import ColorSensor
from spike.control import wait_until
from spike.operator import less_than

color_sensor = ColorSensor('A')

wait_until(color_sensor.get_reflected_light, less_than, 50)
less_than_or_equal_to()
less_than_or_equal_to(a, b)
Tests whether a is less than or equal to b.

This is the same as a <= b.

Parameters
a
Any object that can be compared to b.
Type	any type
Values	any value
Default	no default value
b
Any object that can be compared to a.
Type	any type
Values	any value
Default	no default value
Returns
Type	boolean
Values	True if a <= b, otherwise False.
Example
from spike import ColorSensor
from spike.control import wait_until
from spike.operator import less_than_or_equal_to

color_sensor = ColorSensor('A')

wait_until(color_sensor.get_reflected_light, less_than_or_equal_to, 50)
equal_to()
equal_to(a, b)
Tests whether a is equal to b.

This is the same as a == b.

Parameters
a
Any object that can be compared to b.
Type	any type
Values	any value
Default	no default value
b
Any object that can be compared to a.
Type	any type
Values	any value
Default	no default value
Returns
Type	boolean
Values	True if a == b, otherwise False.
Example
from spike import ColorSensor
from spike.control import wait_until
from spike.operator import equal_to

color_sensor = ColorSensor('A')

wait_until(color_sensor.get_color, equal_to, 'red')
not_equal_to()
not_equal_to(a, b)
Tests whether a is not equal to b.

This is the same as a != b.

Parameters
a
Any object that can be compared to b.
Type	any type
Values	any value
Default	no default value
b
Any object that can be compared to a.
Type	any type
Values	any value
Default	no default value
Returns
Type	boolean
Values	True if a != b, otherwise False.
Example
from spike import ColorSensor
from spike.control import wait_until
from spike.operator import not_equal_to

color_sensor = ColorSensor('A')

wait_until(color_sensor.get_color, not_equal_to, None)
Prime Hub Back to Top
The PrimeHub is divided into six components, each with a number of functions linked to it.

To be able to use the Hub, you must initialize it.

Example
from spike import PrimeHub

# Initialize the Hub.
hub = PrimeHub()
Constants
PrimeHub.left_button
The Left Button on the Hub.

Example
from spike import PrimeHub

hub = PrimeHub()

hub.left_button.wait_until_pressed()
PrimeHub.right_button
The Right Button on the Hub.

Example
from spike import PrimeHub

hub = PrimeHub()

hub.right_button.wait_until_pressed()
PrimeHub.speaker
The speaker inside the Hub.

Example
from spike import PrimeHub

hub = PrimeHub()

hub.speaker.beep()
PrimeHub.light_matrix
The Light Matrix on the Hub.

Example
from spike import PrimeHub

hub = PrimeHub()

hub.light_matrix.off()
PrimeHub.status_light
The Brick Status Light on the Hub’s Center Button.

Example
from spike import PrimeHub

hub = PrimeHub()

hub.status_light.on('blue')
PrimeHub.motion_sensor
The Motion Sensor inside the Hub.

Example
from spike import PrimeHub

hub = PrimeHub()

yaw = hub.motion_sensor.get_yaw_angle()
PrimeHub.PORT_A
The Port labeled “A” on the Hub.

PrimeHub.PORT_B
The Port labeled “B” on the Hub.

PrimeHub.PORT_C
The Port labeled “C” on the Hub.

PrimeHub.PORT_D
The Port labeled “D” on the Hub.

PrimeHub.PORT_E
The Port labeled “E” on the Hub.

PrimeHub.PORT_F
The Port labeled “F” on the Hub.

Single Motors Back to Top
To be able to use Motors, you must initialize them.

Example
from spike import Motor

# Initialize the motor.
motor = Motor('A')
Following are the functions linked to SPIKE Medium Motor and the SPIKE Large Motor.

Actions
run_to_position()
run_to_position(degrees, direction='shortest path', speed=None)
Runs the motor to an absolute position.

The sign of the speed will be ignored (absolute value) and the motor will always travel in the direction specified by direction parameter. If speed is greater than 100, it will be limited to 100.

Parameters
degrees
The target position.
Type	integer (positive or negative whole number, including 0)
Values	0 to 359
Default	no default value
direction
The direction to use to reach the target position.
Type	string (text)
Values	
'shortest path'
could run in either direction depending on the shortest distance to the target.
'clockwise'
will make the motor run clockwise until it reaches the target position.
'counterclockwise'
will make the motor run counterclockwise until it reaches the target position.
Default	no default value
speed
The motor’s speed.
Type	integer (positive or negative whole number, including 0)
Values	0 to 100%
Default	if no value is specified, it will use the default speed set by set_default_speed().
Errors
TypeError: degrees or speed is not an integer or direction is not a string.

ValueError: direction is not one of the allowed values or degrees is not within the range of 0-359 (both inclusive).

RuntimeError: The motor has been disconnected from the Port.

Example
from spike import Motor

motor = Motor('A')

# Set the motor to position 0, aligning the markers
motor.run_to_position(0)
run_to_degrees_counted()
run_to_degrees_counted(degrees, speed=None)
Runs the motor until degrees counted is equal to the value specified by the degrees parameter.

The sign of the speed will be ignored and the motor will always travel in the direction required to reach degrees. If speed is greater than 100, it will be limited to 100.

Parameters
degrees
The target degrees counted.
Type	integer (positive or negative whole number, including 0)
Values	any number
Default	no default value
speed
The desired speed..
Type	integer (positive or negative whole number, including 0)
Values	0 to 100% (positive values only)
Default	no default value
Errors
TypeError: degrees or speed is not an integer.

RuntimeError: The motor has been disconnected from the Port.

Example
from spike import Motor
from spike.control import wait_for_seconds

motor = Motor('A')

for deg in range(0, 721, 90):
    motor.run_to_degrees_counted(deg)
    wait_for_seconds(1)
run_for_degrees()
run_for_degrees(degrees, speed=None)
Runs the motor for a given number of degrees.

Parameters
degrees
The number of degrees the motor should run.
Type	integer (positive or negative whole number, including 0)
Values	any number
Default	no default value
speed
The motor’s speed
Type	integer (positive or negative whole number, including 0)
Values	-100 to 100 %
Default	if no value is specified, it will use the default speed set by set_default_speed().
Errors
TypeError: degrees or speed is not an integer.

RuntimeError: The motor has been disconnected from the Port.

Example
from spike import Motor

motor = Motor('A')

# Run the motor 90 degrees clockwise
motor.run_for_degrees(90)

# Run the motor 90 degrees counterclockwise
motor.run_for_degrees(-90)

# Run the motor 360 degrees clockwise, at maximum speed (100%)
motor.run_for_degrees(360, 100)
run_for_rotations()
run_for_rotations(rotations, speed=None)
Runs the motor for a specified number of rotations.

Parameters
rotations
The number of rotations the motor should run.
Type	float (decimal number)
Values	any number
Default	no default value
speed
The motor’s speed
Type	integer (positive or negative whole number, including 0)
Values	-100% to 100%
Default	if no value is specified, it will use the default speed set by set_default_speed().
Errors
TypeError: rotations is not a number or speed is not an integer.

RuntimeError: The motor has been disconnected from the Port.

Example
from spike import Motor

motor = Motor('A')

# Run the motor 90 degrees clockwise:
motor.run_for_rotations(0.25)

# Run the motor 90 degrees counterclockwise:
motor.run_for_rotations(-0.25)
run_for_seconds()
run_for_seconds(seconds, speed=None)
Runs the motor for a specified number of seconds.

Parameters
seconds
The number of seconds for which the motor should run.
Type	float (decimal number)
Values	any number
Default	no default value
speed
The motor’s speed.
Type	integer (positive or negative whole number, including 0)
Values	-100% to 100%
Default	if no value is specified, it will use the default speed set by set_default_speed().
Errors
TypeError: seconds is not a number or speed is not an integer.

RuntimeError: The motor has been disconnected from the Port.

Example
from spike import Motor

motor = Motor('A')

# Run clockwise for half a second at 75% speed
motor.run_for_seconds(0.5, 75)

# Run counterclockwise for 6 seconds at 30% speed
motor.run_for_seconds(6, -30)
start()
start(speed=None)
Starts running the motor at a specified speed.

The motor will keep moving at this speed until you give it another motor command, or when your program ends.

Parameters
speed
The motor’s speed.
Type	integer (positive or negative whole number, including 0)
Values	-100% to 100%
Default	if no value is specified, it will use the default speed set by set_default_speed().
Errors
TypeError: speed is not an integer.

RuntimeError: The motor has been disconnected from the Port.

Example
from spike import Motor

motor = Motor('A')

motor.start()
# wait until something...
motor.stop()
stop()
Stops the motor.

What the motor does after it stops depends on the action set in set_stop_action(). The default value of set_stop_action() is coast.

Errors
RuntimeError: The motor has been disconnected from the Port.

Example
from spike import Motor

motor = Motor('A')

motor.start()
# wait until something...
motor.stop()
start_at_power()
start_at_power(power)
Starts rotating the motor at a specified power level.

The motor will keep moving at this power level until you give it another motor command, or when your program ends.

Parameters
power
Power of the motor.
Type	integer (positive or negative whole number, including 0)
Values	-100% to 100%
Default	no default value
Errors
TypeError: power is not an integer.

RuntimeError: The motor has been disconnected from the Port.

Measurements
get_speed()
Retrieves the speed of the motor.

Returns
The current speed of the motor
Type	integer (positive or negative whole number, including 0)
Values	-100% to 100%
Errors
RuntimeError: The motor has been disconnected from the Port.

get_position()
Retrieves the position of the motor. This is the clockwise angle between the moving marker and the zero-point marker on the motor.

Returns
The position of the motor
Type	integer (positive or negative whole number, including 0)
Values	0 to 359 degrees
Errors
RuntimeError: The motor has been disconnected from the Port.

get_degrees_counted()
Retrieves the degrees counted by the motor.

Returns
The number of degrees counted.
Type	integer (positive or negative whole number, including 0)
Values	any number
Errors
RuntimeError: The motor has been disconnected from the Port.

get_default_speed()
Retrieves the current default motor speed.

Returns
The default motor’s speed.
Type	integer (positive or negative whole number, including 0)
Values	(-100% to 100%).
Events
was_interrupted()
Tests whether the motor was interrupted.

Returns
True if the motor was interrupted since the last time was_interrupted() was called, otherwise False.
Type	boolean
Values	True or False
Errors
RuntimeError: The motor has been disconnected from the Port.

Example
from spike import Motor

motor = Motor('A')

motor.run_for_rotations(2)
if motor.was_interrupted():
    # the motor did not complete two rotations
was_stalled()
Tests whether the motor was stalled.

Returns
True if the motor was stalled since the last time was_stalled() was called, otherwise False.
Type	boolean
Values	True or False
Errors
RuntimeError: The motor has been disconnected from the Port.

Example
from spike import Motor

motor = Motor('A')

motor.set_stall_detection(True)
motor.run_for_rotations(2)
if motor.was_stalled():
    # the motor did not complete two rotations
Settings
set_degrees_counted()
set_degrees_counted(degrees_counted)
Sets the number of degrees counted to a desired value.

Parameters
degrees_counted
The value to which the number of degrees counted should be set.
Type	integer (positive or negative whole number, including 0)
Values	any number
Default	no default value
Errors
TypeError: degrees_counted is not an integer.

RuntimeError: The motor has been disconnected from the Port.

set_default_speed()
set_default_speed(default_speed)
Sets the default motor speed. This speed will be used when you omit the speed argument in one of the other methods, such as run_for_degrees.

Setting the default speed does not affect any motors that are currently running.

It will only have an effect when another motor method is called after this method.

If the value of default_speed is outside of the allowed range, the default speed will be set to -100 or 100 depending on whether the value was negative or positive.

Parameters
default_speed
The default speed value.
Type	integer (positive or negative whole number, including 0)
Values	-100% to 100%.
Default	no default value
Errors
TypeError: default_speed is not an integer.

set_stop_action()
set_stop_action(action)
Sets the default behavior when a motor stops.

Parameters
action
The desired motor behavior when the motor stops.
Type	string (text)
Values	
'coast', 'brake', 'hold'
Default	coast
Errors
TypeError: action is not a string.

ValueError: action is not one of the allowed values.

RuntimeError: The motor has been disconnected from the Port.

set_stall_detection()
set_stall_detection(stop_when_stalled)
Turns stall detection on or off.

Stall detection senses when a motor has been blocked and can’t move. If stall detection has been enabled and a motor is blocked, the motor will be powered off after two seconds and the current motor command will be interrupted. If stall detection has been disabled, the motor will keep trying to run and programs will “get stuck” until the motor is no longer blocked.

Stall detection is enabled by default.

Parameters
stop_when_stalled
Choose True to enable stall detection or False to disable it.
Type	boolean
Values	True or False
Default	True
Errors
TypeError: stop_when_stalled is not a boolean.

RuntimeError: The motor has been disconnected from the Port.

Example
from spike import Motor

motor = Motor('A')

motor.set_stall_detection(False)
motor.run_for_rotations(2)

# The program will never get here if the motor is stalled
Speaker Back to Top
Following are all of the functions linked to sounds coming out of the SPIKE Prime Hub.

Actions
beep()
beep(note=60, seconds=0.2)
Plays a beep on the Hub.

Your program will not continue until seconds have passed.

Parameters
note
The MIDI note number.
Type	float (decimal number)
Values	44 to 123 (60 is middle C note)
Default	60 (middle C note)
seconds
The duration of the beep in seconds.
Type	float (decimal number)
Values	any values
Default	0.2 seconds
Errors
TypeError: note is not an integer or seconds is not a number.

ValueError: note is not within the allowed range of 44-123.

Example
from spike import PrimeHub

hub = PrimeHub()

# beep beep beep!
hub.speaker.beep(60, 0.5)
hub.speaker.beep(67, 0.5)
hub.speaker.beep(60, 0.5)
start_beep()
start_beep(note=60)
Starts playing a beep.

The beep will play indefinitely until stop() or another beep method is called.

Parameters
note
The MIDI note number.
Type	float (decimal number)
Values	44 to 123 (60 is middle C note)
Default	60 (middle C note)
Errors
TypeError: note is not an integer.

ValueError: note is not within the allowed range of 44-123

Example
from spike import PrimeHub

hub = PrimeHub()

hub.speaker.start_beep()
# do something
hub.speaker.stop()
stop()
Stops any sound that is playing.

Example
from spike import PrimeHub

hub = PrimeHub()

hub.speaker.start_beep()
# do something
hub.speaker.stop()
Measurements
get_volume()
Retrieves the value of the speaker volume.

This only retrieves the volume for the Hub and not the programming app.

Returns
The current volume.
Type	integer (positive or negative whole number, including 0)
Values	0 to 100%
Example
from spike import PrimeHub

hub = PrimeHub()

# increase the volume of the Hub speaker by 10%
hub.speaker.set_volume(hub.speaker.get_volume() + 10)
Settings
set_volume()
set_volume(volume)
Sets the speaker volume.

If the assigned volume is out of range, the nearest volume (0 or 100) will be used instead. This only sets the volume for the Hub and not the programming app.

Parameters
volume
The new volume percentage.
Type	integer (positive or negative whole number, including 0)
Values	0 to 100%
Default	100%
Errors
TypeError: volume is not an integer.

Example
from spike import PrimeHub

hub = PrimeHub()

# set the volume of the Hub speaker to 50%
hub.speaker.set_volume(50)
Status Light Back to Top
Following are all of the functions linked to the programmable Brick Status Light on the SPIKE Prime Hub.

Actions
on()
on(color='white')
Sets the color of the light.

Parameters
color
Illuminates the Brick Status Light on the Hub in the specified color
Type	string (text)
Values	
'azure', 'black', 'blue', 'cyan', 'green', 'orange', 'pink', 'red', 'violet', 'yellow', 'white'
Default	'white'
Errors
TypeError: color is not a string.

ValueError: color is not one of the allowed values.

Example
from spike import PrimeHub

hub = PrimeHub()

hub.status_light.on('blue')
off()
Turns off the light.

Example
from spike import PrimeHub

hub = PrimeHub()

hub.status_light.off()
Wait Functions Back to Top
wait_for_seconds()
wait_for_seconds(seconds)
Waits for a specified number of seconds before continuing the program.

Parameters
seconds
The time to wait in seconds.
Type	float (decimal value)
Values	any value
Default	no default value
Errors
TypeError: seconds is not a number.

ValueError: seconds is not at least 0.

Example
from spike.control import wait_for_seconds

# wait for 3 seconds (pause the program flow)
wait_for_seconds(3)
wait_until()
wait_until(get_value_function, operator_function=<function equal_to>, target_value=True)
Waits until the condition is True before continuing with the program.

Parameters
get_value_function
Type	callable function
Values	A function that returns the current value to be compared to the target value.
Default	no default value
operator_function
Type	callable function
Values	A function that compares two arguments. The first argument will be the result of get_value_function() and the second argument will be target_value. The function will compare these two values and return the result.
Default	no default value
target_value
Type	any type
Values	Any object that can be compared by operator_function.
Default	no default value
Errors
TypeError: get_value_function or operator_function is not callable or operator_function does not compare two arguments.

Example
from spike import ColorSensor
from spike.control import wait_until
from spike.operator import equal_to

color_sensor = ColorSensor('A')

# wait for the Color Sensor to detect red
wait_until(color_sensor.get_color, equal_to, 'red')
Example
from spike import ColorSensor, Motor
from spike.control import wait_until

color_sensor = ColorSensor('A')
motor = Motor('B')

def red_or_position():
    return color_sensor.get_color() == 'red' or motor.get_position() > 90

wait_until(red_or_position)
Timer Back to Top
To be able to use the Timer, you must initialize it.

Example
from spike.control import Timer

# Initialize the Timer.
timer = Timer()
Following are all of the functions linked to the Timer.

reset()
Sets the timer to 0.

Example
from spike.control import Timer

timer = Timer()
# after some time...
timer.reset()
now()
Retrieves the “right now” time of the timer.

Returns
The current time in seconds.
Type	Integer (positive or negative whole number, including 0)
Values	A value greater than 0
Example
from spike.control import Timer

timer = Timer()

while True:
    # if it has been more than 5 seconds since the timer started
    if timer.now() > 5:
        # then break out of the while loop
        break

`