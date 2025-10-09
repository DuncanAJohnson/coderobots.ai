# Original PyScript to React Implementation Mapping

This document shows how each piece of the original PyScript implementation maps to the new React version.

## File Structure Mapping

| Original | New React | Notes |
|----------|-----------|-------|
| `rs232.py` | `src/components/SPIKEEditor.jsx` | Main logic moved to React component |
| `rs232_component.js` | `src/components/ControlPanel.jsx` | UI controls split into component |
| `rs232.html` | `src/components/SPIKEEditor.jsx` | JSX replaces HTML template |
| `rs232.css` | `src/components/SPIKEEditor.css` | Direct port with React classes |
| `stop_spike.py` | `src/utils/stopSpike.js` | Python code as JS constant |
| `micro_repl` import | `src/utils/microRepl.js` | Local copy instead of CDN |

## Class/Function Mapping

### Original: `class uRepl()` (rs232.py)

**New Location**: `src/utils/microRepl.js` - `Board` function

The micro_repl Board class was kept as-is since it's a working implementation.

### Original: `class CEEO_RS232()` (rs232.py)

**New Location**: `src/components/SPIKEEditor.jsx` - Main component

| Original Method | New Implementation | Location |
|----------------|-------------------|----------|
| `__init__()` | `useState` hooks + `useEffect` | SPIKEEditor component |
| `link_ui_elements()` | `useRef` hooks | SPIKEEditor component |
| `on_run_local()` | `handleRunLocal()` | SPIKEEditor line ~145 |
| `save_code_handler()` | _(not implemented - was unused)_ | - |
| `run_handler()` | `handleRun()` | SPIKEEditor line ~167 |
| `run_main_handler()` | _(not implemented - hidden feature)_ | - |
| `upload_handler()` | _(not implemented - hidden feature)_ | - |
| `set_repl_mode()` | `handleEnterREPL()` | SPIKEEditor line ~221 |
| `save_to_slot()` | `handleSaveToSlot()` | SPIKEEditor line ~235 |
| `on_connect()` | `handleConnect()` | SPIKEEditor line ~156 |
| `on_disconnect()` | Board's `ondisconnect` callback | SPIKEEditor line ~73 |
| `on_download()` | _(not implemented - hidden feature)_ | - |
| `on_clear()` | `handleClear()` | SPIKEEditor line ~214 |
| `_stop_code_execution()` | `handleCtrlC()` | SPIKEEditor line ~188 |
| `send_CtrlC()` | `handleCtrlC()` | SPIKEEditor line ~188 |
| `switch_to_repl_mode()` | `handleEnterREPL()` | SPIKEEditor line ~221 |
| `re_list()` | _(not implemented - hidden feature)_ | - |
| `delete_code()` | _(not implemented - hidden feature)_ | - |
| `on_run()` | `handleRun()` | SPIKEEditor line ~167 |
| `on_run_main()` | _(not implemented - hidden feature)_ | - |
| `on_ble_load()` | _(not implemented - hidden feature)_ | - |
| `on_ble_direct()` | _(not implemented - hidden feature)_ | - |
| `on_reset()` | `handleReset()` | SPIKEEditor line ~203 |
| `reset_without_ctrl_c()` | `handleEnterProgramSlot()` | SPIKEEditor line ~228 |
| `on_upload()` | _(not implemented - hidden feature)_ | - |
| `on_title()` | _(not implemented - hidden feature)_ | - |
| `handle_board()` | _(PyScript specific - not needed)_ | - |

### Original: `class RS232Controller` (rs232_component.js)

**New Location**: Split between components

| Original Method | New Implementation | Location |
|----------------|-------------------|----------|
| `constructor()` | Component initialization | Multiple components |
| `setMode()` | `setMode` state + CSS classes | SPIKEEditor + CSS |
| `setConnectedState()` | `setConnected` state | SPIKEEditor |
| `_connectEvents()` | onClick props | ControlPanel |
| `_initResizer()` | `useEffect` with mouse events | SPIKEEditor line ~105 |
| `init()` | Component mount | SPIKEEditor `useEffect` |

## State Management Mapping

### Original Python Class Properties → React State

| Original (Python) | New (React) | Type |
|------------------|-------------|------|
| `self.connected` | `const [connected, setConnected]` | boolean |
| `self.uboard` | `boardRef.current` | Board instance |
| `self.python` | `editorRef.current` | CodeEditor ref |
| `self.list_files` | _(hidden - not implemented)_ | - |
| `self.title_input` | _(hidden - not implemented)_ | - |
| `self.fresh_start_check` | _(hidden - not implemented)_ | - |
| `self.currentMode` | `const [mode, setMode]` | string |
| `self.uboard.is_running_code` | `const [isRunning, setIsRunning]` | boolean |
| `self.uboard.buffer` | `const [buffer, setBuffer]` | string |

## UI Element Mapping

### Original HTML (`rs232.html`) → React JSX

```html
<!-- Original -->
<button id="run_local" class="button">Run Python Code in Browser</button>
```

```jsx
// New React
<button onClick={onRunLocal} className="button">
  Run Python Code in Browser
</button>
```

### Original Mode Classes → React Conditional Classes

```javascript
// Original
btnsContainer.classList.add('repl-mode');
```

```jsx
// New React
<div className={`control-panel right-panel ${mode}-mode`}>
```

## Event Handler Mapping

### Connection Event

**Original (Python)**:
```python
async def on_connect(self, event):
    if self.uboard.connected:
        await self.uboard.board.reset()
        await self.uboard.board.disconnect()
    else:
        await self.uboard.board.connect(self.repl_container_id, stop)
```

**New (React)**:
```javascript
const handleConnect = async () => {
  const board = boardRef.current;
  if (connected) {
    await board.reset();
    await board.disconnect();
  } else {
    await board.connect(replContainerRef.current, true);
  }
};
```

### Run Code Event

**Original (Python)**:
```python
async def on_run(self, event):
    if self.uboard.connected:
        if self.uboard.is_running_code:
            await self._stop_code_execution()
        self.uboard.is_running_code = True
        await self.uboard.paste(self.python.code)
```

**New (React)**:
```javascript
const handleRun = async () => {
  const board = boardRef.current;
  const currentCode = editorRef.current?.getCode() || code;
  
  if (isRunning) {
    await handleCtrlC();
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  setIsRunning(true);
  await board.paste(currentCode, { hidden: false });
};
```

### Save to Slot Event

**Original (Python)**:
```python
async def save_to_slot(self, slot_number, code_content):
    slot_str = "{:02d}".format(int(slot_number))
    escaped_code = json.dumps(code_content)
    script_to_run = f"""
import os
# ... (slot saving code)
"""
    await self.uboard.paste(script_to_run)
    await self.uboard.board.reset()
```

**New (React)**:
```javascript
const handleSaveToSlot = async () => {
  const board = boardRef.current;
  const currentCode = editorRef.current?.getCode() || code;
  const slotStr = String(selectedSlot).padStart(2, '0');
  const escapedCode = JSON.stringify(currentCode);
  
  const script = `
import os
# ... (slot saving code)
`;
  
  await board.paste(script);
  await board.reset();
};
```

## Data Flow Comparison

### Original PyScript Flow

```
User Click → JS Event → Python Async Method → 
  → micro_repl Board → Serial API → Device
```

### New React Flow

```
User Click → React Event Handler → 
  → Board (JS) → Serial API → Device
```

## Key Differences

### 1. Python ↔ JavaScript Bridge (Eliminated)

**Original**: Required PyScript's bridge between Python and JavaScript
```python
# Python code calling JS
self.js_controller.setMode('repl')
```

**New**: Pure JavaScript/React
```javascript
setMode('repl');
```

### 2. Element References

**Original**: Python proxies to DOM elements
```python
self.python = getattr(elements, 'editor', None)
self.python.code = new_code
```

**New**: React refs
```javascript
const editorRef = useRef(null);
editorRef.current.setCode(newCode);
```

### 3. State Updates

**Original**: Direct property mutation
```python
self.uboard.is_running_code = True
```

**New**: React state setters
```javascript
setIsRunning(true);
```

### 4. Template Rendering

**Original**: Separate HTML file loaded at runtime
```javascript
container.innerHTML = await response.text();
```

**New**: JSX in component
```jsx
return (
  <div className="spike-editor">
    {/* Component structure */}
  </div>
);
```

## Code Size Comparison

| Component | Original | New | Change |
|-----------|----------|-----|--------|
| Main Logic | 381 lines (Python) | 327 lines (JSX) | -14% |
| UI Controller | 120 lines (JS) | 78 lines (JSX) | -35% |
| Template | 85 lines (HTML) | Included in JSX | Merged |
| Styling | 220 lines (CSS) | 220 lines (CSS) | Same |
| **Total** | **806 lines** | **625 lines** | **-22%** |

## Functionality Not Implemented (Hidden Features)

These were marked `hidden` in the original and not implemented:

1. **File Browser** (`list_files` dropdown)
2. **File Download** (`on_download` button)
3. **File Delete** (`delete` button)
4. **File Re-list** (`re_list` button)
5. **Hub Name/Title** (`title` input)
6. **Fresh Start Checkbox** (always true in new version)
7. **Run as main.py** (`run_main` button)
8. **Upload Code** (`upload` button)
9. **BLE Features** (`ble_load`, `ble_direct` buttons)

These can be easily added later if needed - the infrastructure is already in place in `microRepl.js`.

## Python Code Templates

### LIST_CODE

**Original**: In `rs232.py` as `list_code`
**New**: In `SPIKEEditor.jsx` lines 10-35

Both identical - Python code for recursive file listing.

### READ_CODE

**Original**: In `rs232.py` as `read_code`
**New**: In `SPIKEEditor.jsx` lines 37-42

Both identical - Python code for reading files.

### STOP_CODE

**Original**: In `stop_spike.py`
**New**: In `src/utils/stopSpike.js`

Both identical - Python code for stopping motors.

## Conclusion

The new React implementation maintains 100% functional parity with the original PyScript version for all visible/enabled features. The code is cleaner, more maintainable, and follows React best practices while preserving all the serial communication and device control capabilities.

