# SPIKE PRIME React Editor

A React-based code editor for programming LEGO SPIKE PRIME robots using Python. This application allows you to write, test, and deploy Python code to SPIKE PRIME devices directly from your browser.

## Features

- **Code Editor**: CodeMirror 6 editor with Python syntax highlighting
- **Serial Communication**: Connect to SPIKE PRIME devices via Web Serial API
- **Dual Execution Modes**:
  - Run Python code locally in the browser using Pyodide
  - Execute Python code directly on connected SPIKE devices
- **REPL Terminal**: Interactive terminal using xterm.js for real-time feedback
- **Program Slot Management**: Save programs to specific slots (0-19) on SPIKE devices
- **Mode Switching**: Toggle between REPL mode and Program Slot mode
- **Resizable Layout**: Adjustable split-pane interface

## Installation

Dependencies have already been installed:

```bash
npm install
```

## Running the Application

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

## Architecture

### Components

- **SPIKEEditor.jsx**: Main container component managing state and integration
- **CodeEditor.jsx**: CodeMirror 6 wrapper for Python code editing
- **Terminal.jsx**: xterm.js wrapper for terminal display
- **ControlPanel.jsx**: UI controls for left and right panels

### Services

- **pyodideManager.js**: Manages Pyodide initialization and local Python execution

### Utils

- **microRepl.js**: Web Serial API wrapper for SPIKE device communication
- **stopSpike.js**: Python code to stop motors and reset devices

## Usage

### Connecting to a SPIKE Device

1. Click the **Connect** button in the right panel
2. Select your SPIKE PRIME device from the browser's serial port dialog
3. Once connected, the status will change to "REPL Mode"

### Running Code

**Run in Browser:**
- Click "Run Python Code in Browser" to execute code using Pyodide
- Output appears in the terminal

**Run on Device:**
- Ensure device is connected
- Click "▶ Run Program" to execute code on the SPIKE device
- Code output appears in the REPL terminal

### Saving to Program Slots

1. Ensure device is connected
2. Select a slot number (0-19) from the dropdown
3. Click "Save to Slot"
4. The code will be saved to the device's internal storage
5. The device will reset and switch to Program Slot mode

### Mode Management

**REPL Mode:**
- Interactive Python REPL on the device
- Can run code snippets directly
- Full control over device execution

**Program Slot Mode:**
- Device runs the saved program from the selected slot
- Limited interaction (reset and mode switching only)
- Click "Enter REPL Mode" to return to interactive mode

### Control Buttons

- **Connect/Disconnect**: Establish/close serial connection
- **Run Program**: Execute current code on device
- **Stop Program**: Send Ctrl+C to interrupt execution
- **Reset Device**: Soft reboot the SPIKE device
- **Clear Console**: Clear the terminal display
- **Enter REPL Mode**: Switch to interactive REPL
- **Enter Program Slot Mode**: Switch to program execution mode
- **Save to Slot**: Save code to device storage

## Browser Compatibility

This application requires a browser with Web Serial API support:

- ✅ Chrome/Edge 89+
- ✅ Opera 75+
- ❌ Firefox (not yet supported)
- ❌ Safari (not yet supported)

## Technical Details

### Python Code Templates

The application uses several Python code templates:

**LIST_CODE**: Recursively lists all files on the device
```python
import os
def listdir(directory):
    # ... (recursive file listing)
```

**READ_CODE**: Reads file content from device
```python
f = open('{path}', "rb")
result = f.read().decode('utf-8')
f.close()
```

**STOP_CODE**: Stops all motors
```python
import motor
motor.stop()
import motor_pair
motor_pair.unpair(motor_pair.PAIR_1)
# ... (unpair all motor pairs)
```

### Serial Communication

The application uses the `micro_repl` library which implements:
- Web Serial API integration
- xterm.js terminal rendering
- Paste mode for multi-line code execution
- File upload capabilities
- Device reset and REPL management

### Local Python Execution

Pyodide is loaded on-demand and provides:
- Full Python 3.11 runtime in the browser
- Standard library support
- stdout/stderr capture for terminal display

## File Structure

```
src/
├── components/
│   ├── SPIKEEditor.jsx      # Main editor component
│   ├── SPIKEEditor.css      # Editor styles
│   ├── CodeEditor.jsx       # CodeMirror wrapper
│   ├── Terminal.jsx         # xterm.js wrapper
│   └── ControlPanel.jsx     # Control buttons
├── services/
│   └── pyodideManager.js    # Pyodide management
├── utils/
│   ├── microRepl.js         # Serial communication
│   └── stopSpike.js         # SPIKE utilities
├── App.jsx                  # Root component
├── App.css                  # App styles
└── main.jsx                 # Entry point
```

## Known Limitations

1. Web Serial API is not supported in all browsers
2. File list and device file management features are currently hidden (can be enabled if needed)
3. The terminal buffer is limited to 10,000 characters (FIFO)
4. Pyodide takes a few seconds to load on first use

## Future Enhancements

Potential improvements:
- Add file browser for device files
- Implement code save/load functionality
- Add example code snippets
- Support for multiple connected devices
- Syntax error highlighting
- Code completion/IntelliSense
- Dark mode support

## Troubleshooting

**Device won't connect:**
- Ensure USB cable is properly connected
- Try unplugging and reconnecting the device
- Check that no other application is using the serial port

**Code won't run on device:**
- Verify device is connected (status shows "REPL Mode")
- Try resetting the device
- Check for Python syntax errors in your code

**Terminal not displaying:**
- Try clearing the console and reconnecting
- Refresh the page and reconnect

## License

This project is built for educational purposes with LEGO SPIKE PRIME robots.

