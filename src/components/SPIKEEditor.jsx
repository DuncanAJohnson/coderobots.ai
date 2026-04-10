import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import Board from '../utils/microRepl.js';
import { STOP_CODE } from '../utils/stopSpike.js';
import { STOP_CODE_MICROBIT } from '../utils/stopMicroBit.js';
import {
  shouldInstallMicrobitFirmware,
  openMicrobitInstallerSession,
  waitForMicrobitSerialPort,
  findAuthorizedMicrobitSerialPort,
} from '../utils/microbitFirmware.js';
import CodeEditor from './CodeEditor.jsx';
import ControlPanel from './ControlPanel.jsx';
import FlashProgressModal from './FlashProgressModal.jsx';
import LegoConnectPanel from './LegoConnectPanel.jsx';
import { createLegoTerminal } from '../utils/legoTerminal.js';
import { ensurePyodide, runPython, isPyodideReady, interruptPython, freezeBridge, terminatePyodide } from '../utils/pyodideRunner.js';
import { disconnectAll as legoDisconnectAll, stopAllMotion as legoStopAllMotion } from '../utils/legoDevices.js';
import { useLanguage } from '../contexts/LanguageContext';
import { useHardware } from '../contexts/HardwareContext';
import './SPIKEEditor.css';

const FIFO_SIZE = 10000;
const CODE_STORAGE_KEY = 'coderobots_editor_code';

const SPIKEEditor = forwardRef(({ initialCode, onConnectionChange }, ref) => {
  const { t } = useLanguage();
  const { hardware, isMicrobit, isLegoEducation, registerDisconnectHandler } = useHardware();
  const [connected, setConnected] = useState(false);
  const [mode, setMode] = useState('disconnected');
  const [code, setCode] = useState(t('initialCode'));
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [buffer, setBuffer] = useState('');
  const [flashPhase, setFlashPhase] = useState(null); // null | 'probing' | 'flashing' | 'reconnecting'
  const [flashProgress, setFlashProgress] = useState(null); // null = indeterminate, 0-100 = determinate
  const [flashMessage, setFlashMessage] = useState('');
  const [needsFirmware, setNeedsFirmware] = useState(false);
  const connectedRef = useRef(false);

  const editorRef = useRef(null);
  const terminalRef = useRef(null);
  const boardRef = useRef(null);
  const replContainerRef = useRef(null);
  const resizerRef = useRef(null);
  const containerRef = useRef(null);
  const replDetectedRef = useRef(false);
  const legoTerminalRef = useRef(null);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getCode: () => editorRef.current?.getCode() || code,
    getBuffer: () => buffer,
    setCode: (newCode) => {
      setCode(newCode);
      if (editorRef.current?.setCode) {
        editorRef.current.setCode(newCode);
      }
      // Save to localStorage
      saveCodeToStorage(newCode);
    },
  }));

  // Load code from localStorage on mount
  useEffect(() => {
    try {
      const savedCode = localStorage.getItem(CODE_STORAGE_KEY);
      if (savedCode) {
        setCode(savedCode);
      } else if (initialCode) {
        setCode(initialCode);
      }
    } catch (error) {
      console.warn('Failed to load code from localStorage:', error);
      if (initialCode) {
        setCode(initialCode);
      }
    }
  }, []);

  // Save code to localStorage helper
  const saveCodeToStorage = (codeToSave) => {
    try {
      localStorage.setItem(CODE_STORAGE_KEY, codeToSave);
    } catch (error) {
      console.warn('Failed to save code to localStorage:', error);
    }
  };

  // Save code when it changes (debounced via effect)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveCodeToStorage(code);
    }, 1000); // Debounce saves by 1 second

    return () => clearTimeout(timeoutId);
  }, [code]);

  // Initialize board on mount (skip for LEGO Education — it uses Pyodide, not a serial REPL)
  useEffect(() => {
    if (isLegoEducation) return;
    if (!boardRef.current) {
      boardRef.current = new Board({
        baudRate: 115200,
        dataType: 'string',
        onconnect: () => {
          console.log('Device connected');
          connectedRef.current = true;
          setConnected(true);
          setMode('repl');
          onConnectionChange?.(true);
        },
        ondisconnect: () => {
          console.log('Device disconnected');
          connectedRef.current = false;
          setConnected(false);
          setMode('disconnected');
          setBuffer('');
          setIsRunning(false);
          onConnectionChange?.(false);
        },
        onerror: (error) => {
          console.error('Board error:', error);
          if (terminalRef.current) {
            terminalRef.current.write(`\r\nError: ${error.message}\r\n`);
          }
        },
        ondata: (chunk) => {
          // Update buffer (FIFO)
          setBuffer(prev => {
            const newBuffer = prev + chunk;
            return newBuffer.slice(-FIFO_SIZE);
          });

          // Check if execution finished (prompt appears)
          if (chunk.includes('>>> ')) {
            replDetectedRef.current = true;
            setTimeout(() => setIsRunning(false), 100);
          }
        },
        theme: {
          background: '#ffffff',
          foreground: '#000000'
        }
      });
    }
  }, [isLegoEducation]);

  // LEGO Education mode: mount a standalone xterm + lazy-load Pyodide.
  useEffect(() => {
    if (!isLegoEducation) return;
    let cancelled = false;
    let controller = null;

    (async () => {
      const host = replContainerRef.current;
      if (!host) return;
      try {
        controller = await createLegoTerminal(host);
        if (cancelled) { controller.dispose(); return; }
        legoTerminalRef.current = controller;
        controller.write(`${t('legoLoadingPython')}\r\n`);

        await ensurePyodide({
          onStdout: (s) => legoTerminalRef.current?.write(s.replace(/\n/g, '\r\n')),
          onStderr: (s) => legoTerminalRef.current?.write(`\x1b[31m${s.replace(/\n/g, '\r\n')}\x1b[0m`),
        });
        if (cancelled) return;
        controller.write(`\r\n${t('legoPythonReady')}\r\n`);
        setConnected(true);
        setMode('repl');
        onConnectionChange?.(true);
      } catch (err) {
        console.error('[LEGO] Pyodide init failed:', err);
        controller?.write(`\r\n\x1b[31mPyodide init failed: ${err?.message || err}\x1b[0m\r\n`);
      }
    })();

    return () => {
      cancelled = true;
      if (controller && legoTerminalRef.current === controller) {
        legoTerminalRef.current = null;
        try { controller.dispose(); } catch {}
      }
      try { terminatePyodide(); } catch {}
      setConnected(false);
      setMode('disconnected');
      onConnectionChange?.(false);
    };
  }, [isLegoEducation]);

  // Register a disconnect handler so hardware switches clean up the board.
  useEffect(() => {
    if (!registerDisconnectHandler) return;
    return registerDisconnectHandler(async () => {
      const board = boardRef.current;
      if (board && connectedRef.current) {
        try { await board.reset(); } catch {}
        try { await board.disconnect(); } catch {}
      }
      // LEGO Education: close all Bluetooth connections + kill Pyodide
      // worker so the next mode has a clean slate.
      try { await legoDisconnectAll(); } catch {}
      try { terminatePyodide(); } catch {}
      setNeedsFirmware(false);
      setFlashPhase(null);
      setFlashProgress(null);
      setFlashMessage('');
    });
  }, [registerDisconnectHandler]);

  // Resizable pane logic
  useEffect(() => {
    const resizer = resizerRef.current;
    const container = containerRef.current;
    if (!resizer || !container) return;

    let isDragging = false;

    const handleMouseDown = (e) => {
      e.preventDefault();
      isDragging = true;
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const rect = container.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const percent = (offsetY / rect.height) * 100;
      container.style.gridTemplateRows = `${percent}% 5px minmax(0, 1fr)`;
      
      // Resize the terminal to fit the new container size
      if (boardRef.current) {
        boardRef.current.resize();
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    resizer.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      resizer.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Resize terminal when container size changes
  useEffect(() => {
    const terminalContainer = replContainerRef.current;
    if (!terminalContainer) return;

    const resizeObserver = new ResizeObserver(() => {
      if (boardRef.current) {
        boardRef.current.resize();
      }
    });

    resizeObserver.observe(terminalContainer);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Connect to a micro:bit and verify MicroPython is present.
  // If `preselectedPort` is null, the browser serial picker appears;
  // otherwise the already-authorized port is reused with no prompt.
  const connectMicrobit = async (preselectedPort) => {
    const board = boardRef.current;
    replDetectedRef.current = false;
    const result = await board.connect(replContainerRef.current, false, preselectedPort);
    if (!result) {
      throw new Error('did not respond like a MicroPython REPL');
    }
    await board.write('\x03');
    const hasMicroPython = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 4000);
      const interval = setInterval(() => {
        if (replDetectedRef.current) {
          clearTimeout(timeout);
          clearInterval(interval);
          resolve(true);
        }
      }, 100);
    });
    if (!hasMicroPython) {
      await board.disconnect();
      throw new Error('Timed out while waiting for MicroPython REPL');
    }
  };

  const handleConnect = async () => {
    // In LEGO mode the per-device connect buttons live in <LegoConnectPanel>,
    // so the generic Connect button in ControlPanel is a no-op.
    if (isLegoEducation) return;

    const board = boardRef.current;
    if (!board) return;

    if (connected) {
      await board.reset();
      await board.disconnect();
      return;
    }

    try {
      console.log('Trying to connect to device');
      if (isMicrobit) {
        // Reuse a previously-authorized micro:bit port so the browser
        // doesn't keep re-prompting for port selection.
        const existingPort = await findAuthorizedMicrobitSerialPort();
        await connectMicrobit(existingPort);
      } else {
        await board.connect(replContainerRef.current, true);
      }
    } catch (error) {
      console.error('Connection failed:', error);
      if (board.connected) {
        try { await board.disconnect(); } catch { /* already disconnected */ }
      }
      if (isMicrobit && shouldInstallMicrobitFirmware(error)) {
        // Show the "Install Firmware" button — we can't open WebUSB here
        // because the original user gesture has expired.
        setNeedsFirmware(true);
      } else if (terminalRef.current) {
        terminalRef.current.write(`\r\nConnection failed: ${error.message}\r\n`);
      }
    }
  };

  const handleFlashFirmware = async () => {
    setNeedsFirmware(false);
    setFlashPhase('flashing');
    setFlashProgress(0);
    setFlashMessage(t('flashMsgInstalling'));
    let session = null;
    try {
      session = await openMicrobitInstallerSession();
      await session.flashBundledFirmware({
        onStatus: (msg) => { if (msg) setFlashMessage(msg); },
        onProgress: (pct) => setFlashProgress(typeof pct === 'number' ? pct : null),
      });
      await session.close();
      session = null;

      setFlashPhase('reconnecting');
      setFlashProgress(null);
      setFlashMessage(t('flashMsgReconnecting'));
      const reconnectedPort = await waitForMicrobitSerialPort();

      setFlashPhase(null);
      setFlashProgress(null);
      setFlashMessage('');

      // Auto-reconnect — the port is already authorized, so no prompt.
      if (reconnectedPort) {
        try {
          await connectMicrobit(reconnectedPort);
        } catch (reconnectError) {
          console.error('Post-flash auto-connect failed:', reconnectError);
          if (terminalRef.current) {
            terminalRef.current.write(`\r\nReconnect failed: ${reconnectError.message}\r\n`);
          }
        }
      }
    } catch (flashError) {
      if (session) {
        try { await session.close(); } catch {}
      }
      setFlashPhase(null);
      setFlashProgress(null);
      setFlashMessage('');
      console.error('Firmware flash failed:', flashError);
    }
  };

  const handleRun = async () => {
    const currentCode = editorRef.current?.getCode() || code;

    if (isLegoEducation) {
      if (!isPyodideReady()) {
        legoTerminalRef.current?.write(`\r\n\x1b[33m${t('legoLoadingPython')}\x1b[0m\r\n`);
        return;
      }
      setIsRunning(true);
      try {
        legoTerminalRef.current?.write('\r\n>>> run\r\n');
        await runPython(currentCode);
      } catch (error) {
        // KeyboardInterrupt is expected when the user presses Stop —
        // it's how we unwind the script. Don't surface it as a failure.
        const msg = String(error?.message || error);
        if (msg.includes('KeyboardInterrupt') || msg.includes('Programmet blev stoppet')) {
          legoTerminalRef.current?.write('\r\n\x1b[33m[stopped]\x1b[0m\r\n');
        } else {
          console.error('Pyodide run failed:', error);
          legoTerminalRef.current?.write(`\r\n\x1b[31m${msg}\x1b[0m\r\n`);
        }
      } finally {
        setIsRunning(false);
      }
      return;
    }

    const board = boardRef.current;
    if (!board || !connected) return;

    // Stop any running code first
    if (isRunning) {
      await handleCtrlC();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsRunning(true);
    try {
      await board.paste(currentCode, { hidden: false });
      board.terminal?.focus();
    } catch (error) {
      console.error('Run failed:', error);
      setIsRunning(false);
    }
  };

  const handleCtrlC = async () => {
    if (isLegoEducation) {
      setIsRunning(false);
      // Freeze the bridge FIRST so the Python worker can no longer issue
      // device commands — any in-flight RPC fails immediately, and any
      // subsequent motor_run gets rejected on arrival instead of racing
      // ahead of our motor_stop below.
      try { freezeBridge(); } catch (e) { console.warn(e); }
      // Raise KeyboardInterrupt so the script unwinds instead of
      // continuing to issue (now-failing) commands.
      try { interruptPython(); } catch (e) { console.warn(e); }
      // Halt motors directly from the main thread — this BLE call is
      // not routed through the paused bridge.
      try { await legoStopAllMotion(); } catch (e) { console.warn(e); }
      // Send stop a second time once any late GATT writes have drained,
      // in case the firmware received a motor_run after our first stop.
      setTimeout(() => { legoStopAllMotion().catch(() => {}); }, 150);
      legoTerminalRef.current?.write('\r\n\x1b[33m[stop]\x1b[0m\r\n');
      return;
    }

    const board = boardRef.current;
    if (!board || !connected) return;

    setIsRunning(false);
    await board.write('\x03');
    
    // Give a moment for buffer to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Stop motors/outputs
    try {
      const stopCode = isMicrobit ? STOP_CODE_MICROBIT : STOP_CODE;
      await board.eval(stopCode, { hidden: true });
    } catch (error) {
      console.error('Failed to stop motors:', error);
    }
  };

  const handleReset = async () => {
    const board = boardRef.current;
    if (!board || !connected) return;

    setIsRunning(false);
    await board.reset();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await board.write('\x03');
    setMode('repl');
    board.terminal?.focus();
  };

  const handleClear = async () => {
    if (terminalRef.current) {
      terminalRef.current.clear();
    }
    if (boardRef.current?.terminal) {
      boardRef.current.terminal.clear();
    }
    if (legoTerminalRef.current) {
      legoTerminalRef.current.clear();
    }
    setBuffer('');
  };

  const handleEnterREPL = async () => {
    const board = boardRef.current;
    if (!board || !connected) return;

    await board.write('\x03');
    setMode('repl');
  };

  const handleEnterProgramSlot = async () => {
    const board = boardRef.current;
    if (!board || !connected) return;

    setIsRunning(false);
    await board.reset();
    setMode('program-slot');
    board.terminal?.focus();
  };

  const handleSaveToMainPy = async () => {
    const board = boardRef.current;
    if (!board || !connected) {
      alert(t('cannotSaveToMainPy'));
      return;
    }

    const currentCode = editorRef.current?.getCode() || code;

    try {
      await board.upload('main.py', currentCode);
    } catch (error) {
      console.error('Failed to save main.py:', error);
      alert(`${t('failedToSaveMainPy')}${error.message}`);
    }
  };

  const handleSaveToSlot = async () => {
    const board = boardRef.current;
    if (!board || !connected) {
      alert(t('cannotSaveToSlot'));
      return;
    }

    const currentCode = editorRef.current?.getCode() || code;
    
    const slotStr = String(selectedSlot).padStart(2, '0');
    
    console.log(`Saving code to SPIKE program slot ${selectedSlot}...`);

    // Escape the code content to be a valid Python string literal
    const escapedCode = JSON.stringify(currentCode);

    // Construct the Python script to save to the slot
    const script = `
import os
import sys

slot_dir_name = "${slotStr}"
code_to_write = ${escapedCode}
program_dir = "program"
target_file = "program.py"

# Ensure we are in the root directory
if (not os.getcwd() == '/flash'):
    os.chdir('/flash')

# Check for 'program' directory, create if it doesn't exist
if program_dir not in os.listdir():
    os.mkdir(program_dir)
os.chdir(program_dir)

# Check for the specific slot directory, create if it doesn't exist
if slot_dir_name not in os.listdir():
    os.mkdir(slot_dir_name)
os.chdir(slot_dir_name)

# Clean up old program files to ensure our .py file runs
for filename in ['program.mpy', 'program.py']:
    try:
        os.remove(filename)
    except OSError:
        pass # File didn't exist, which is fine

# Write the new program file in chunks of chunk_size characters
with open(target_file, "w") as f:
    f.write(code_to_write)

# Try to return to the root directory
os.chdir('/flash')
`;

    try {
      await board.paste(script, { hidden: false });
      await board.reset();
      setMode('program-slot');
      board.terminal?.focus();
    } catch (error) {
      console.error('Failed to save to slot:', error);
      alert(`${t('failedToSaveToSlot')}${error.message}`);
    }
  };

  return (
    <div className="spike-editor">
      <div className="parent" ref={containerRef}>
        <div className="child top-child">
          <div className="editor-wrapper">
            <CodeEditor
              ref={editorRef}
              initialCode={code}
              onChange={setCode}
            />
          </div>
        </div>

        <div className="resizer" ref={resizerRef}></div>

        <div className="child bottom-child">
          {isLegoEducation && <LegoConnectPanel />}
          <ControlPanel
            connected={connected}
            mode={mode}
            selectedSlot={selectedSlot}
            onSlotChange={setSelectedSlot}
            onConnect={handleConnect}
            onRun={handleRun}
            onCtrlC={handleCtrlC}
            onReset={handleReset}
            onClear={handleClear}
            onEnterREPL={handleEnterREPL}
            onEnterProgramSlot={handleEnterProgramSlot}
            onSaveToSlot={handleSaveToSlot}
            hardware={hardware}
            onSaveToMainPy={handleSaveToMainPy}
            isRunning={isRunning}
          />
          {needsFirmware && flashPhase === null && (
            <div className="flash-prompt">
              <span>{t('flashMicrobitConfirm')}</span>
              <button className="button flash-button" onClick={handleFlashFirmware}>
                {t('installFirmware')}
              </button>
            </div>
          )}
          <FlashProgressModal
            open={flashPhase !== null}
            phase={flashPhase}
            progress={flashProgress}
            message={flashMessage}
          />
          <div className="terminal-wrapper" ref={replContainerRef}>
            {/* The micro_repl Board will render the xterm terminal here */}
          </div>
        </div>
      </div>
    </div>
  );
});

SPIKEEditor.displayName = 'SPIKEEditor';

export default SPIKEEditor;
