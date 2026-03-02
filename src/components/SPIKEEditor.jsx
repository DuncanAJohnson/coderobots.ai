import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import Board from '../utils/microRepl.js';
import { STOP_CODE_LILYBOT } from '../utils/stopSpike.js';
import {
  openMicrobitInstallerSession,
  shouldInstallMicrobitFirmware,
} from '../utils/microbitInstall.js';
import CodeEditor from './CodeEditor.jsx';
import ControlPanel from './ControlPanel.jsx';
import CodeTabs from './CodeTabs.jsx';
import { useSession } from '../contexts/SessionContext';
import { logConsole, logInteraction } from '../services/dataLogger';
import './SPIKEEditor.css';

const FIFO_SIZE = 10000;


const SPIKEEditor = forwardRef(({ sessionId }, ref) => {
  const [connected, setConnected] = useState(false);
  const [connectedBoard, setConnectedBoard] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusBanner, setStatusBanner] = useState({
    type: 'info',
    message: 'Not connected.'
  });
  const [mode, setMode] = useState('disconnected');
  const [isRunning, setIsRunning] = useState(false);
  const [buffer, setBuffer] = useState('');
  const [microbitInstallArmed, setMicrobitInstallArmed] = useState(false);

  const { 
    codeRecords, 
    currentCodeId, 
    currentCodeContent,
    firmwareVersion,
    switchCode, 
    createNewCode, 
    updateCodeName,
    updateCurrentCodeContent,
    createSnapshot
  } = useSession();

  const editorRef = useRef(null);
  const boardRef = useRef(null);
  const replContainerRef = useRef(null);
  const resizerRef = useRef(null);
  const containerRef = useRef(null);
  const isLocalChangeRef = useRef(false);

  const logInteractionSafe = async (action) => {
    if (!sessionId) return;
    try {
      await logInteraction(action, sessionId);
    } catch (error) {
      console.warn(`Failed to log interaction (${action}):`, error);
    }
  };

  const logConsoleSafe = async (content, action) => {
    if (!sessionId || !content) return;
    try {
      await logConsole(content, sessionId, action);
    } catch (error) {
      console.warn(`Failed to log console (${action}):`, error);
    }
  };

  const getConnectionErrorMessage = (error) => {
    const message = error?.message || 'Unknown serial error';
    if (/WebUSB is not available/i.test(message)) {
      return 'Connection failed: WebUSB is required to install micro:bit MicroPython. Use a Chromium-based browser.';
    }
    if (/No device selected|no-device-selected/i.test(message)) {
      return 'Connection failed: no micro:bit selected in the browser device picker.';
    }
    if (/Bad response for 8 -> 17|reconnect-microbit/i.test(message) || /reconnect-microbit/i.test(error?.code || '')) {
      return 'Connection failed: unstable WebUSB link to micro:bit. Unplug/replug the board, then click Connect micro:bit again.';
    }
    if (/WebUSB still unstable|WebUSB flashing link stayed unstable/i.test(message)) {
      return message;
    }
    if (/MicroPython install requires WebUSB access/i.test(message)) {
      return message;
    }
    if (/did not respond like a MicroPython REPL/i.test(message)) {
      return 'Connection failed: selected device is not a compatible MicroPython REPL.';
    }
    if (/Failed to open serial port|NetworkError|busy|resource/i.test(message)) {
      return 'Connection failed: serial port is busy. Close any other serial connections to the device and try again.';
    }
    if (/No port selected by the user/i.test(message)) {
      return 'Connection failed: no device selected by the user.';
    }
    return `Connection failed: ${message}`;
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getCode: () => editorRef.current?.getCode() || currentCodeContent,
    getBuffer: () => buffer,
  }));

  // Update code editor when current code content changes (from session load or tab switch)
  useEffect(() => {
    if (!isLocalChangeRef.current && editorRef.current?.setCode) {
      editorRef.current.setCode(currentCodeContent);
    }
    isLocalChangeRef.current = false;
  }, [currentCodeContent]);

  // Handle code changes in the editor (local state only, no database save)
  const handleCodeChange = (newCode) => {
    isLocalChangeRef.current = true;
    updateCurrentCodeContent(newCode);
  };

  // Initialize board on mount
  useEffect(() => {
    if (!boardRef.current) {
      boardRef.current = new Board({
        baudRate: 115200,
        dataType: 'string',
        onconnect: () => {
          console.log('Device connected');
          setIsConnecting(false);
          setConnected(true);
          setMode('repl');
          setStatusBanner({
            type: 'success',
            message: 'Device Status: Connected. REPL is ready.'
          });
        },
        ondisconnect: () => {
          console.log('Device disconnected');
          setIsConnecting(false);
          setConnected(false);
          setConnectedBoard(null);
          setMicrobitInstallArmed(false);
          setMode('disconnected');
          setBuffer('');
          setIsRunning(false);
          setStatusBanner({
            type: 'info',
            message: 'Device Status: Disconnected.'
          });
        },
        onportselected: () => {
          setStatusBanner({
            type: 'info',
            message: 'Attempting to connect...'
          });
        },
        onerror: (error) => {
          console.error('Board error:', error);
          setIsConnecting(false);
          const message = getConnectionErrorMessage(error);
          setStatusBanner({
            type: 'error',
            message
          });
          const terminal = boardRef.current?.terminal;
          if (terminal) {
            terminal.write(`\r\n${message}\r\n`);
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
            setTimeout(() => setIsRunning(false), 100);
          }
        },
        theme: {
          background: '#ffffff',
          foreground: '#000000'
        }
      });
    }
  }, []);

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
      container.style.gridTemplateRows = `${percent}% 5px auto`;
      
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

  const handleDisconnect = async () => {
    const board = boardRef.current;
    if (!board || isConnecting) return;

    setIsConnecting(true);
    try {
      if (!connected) return;
      setStatusBanner({
        type: 'info',
        message: 'Disconnecting...'
      });
      await logInteractionSafe('disconnect');
      await board.disconnect();
    }
    finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = async (targetBoard) => {
    const board = boardRef.current;
    if (!board || isConnecting || connected) return;

    setIsConnecting(true);
    let installerSession = null;
    try {
      if (targetBoard === 'microbit' && microbitInstallArmed) {
        try {
          installerSession = await openMicrobitInstallerSession({
            allowDevicePrompt: true,
            onStatus: (message) => {
              setStatusBanner({
                type: 'info',
                message
              });
            }
          });
          setStatusBanner({
            type: 'info',
            message: 'Installing MicroPython on micro:bit...'
          });
        } catch (installerPrepError) {
          throw installerPrepError;
        }
      } else {
        setStatusBanner({
          type: 'info',
          message: `Waiting for ${targetBoard === 'microbit' ? 'micro:bit' : 'Pico'} serial device selection...`
        });
      }
      // Keep requestPort in the direct click gesture path.
      void logInteractionSafe(`connect_${targetBoard}`);
      try {
        if (targetBoard === 'microbit' && installerSession) {
          await installerSession.flashBundledFirmware({
            onStatus: (message) => {
              setStatusBanner({
                type: 'info',
                message
              });
            },
            onProgress: (progressPercent) => {
              if (typeof progressPercent !== 'number') return;
              setStatusBanner({
                type: 'info',
                message: `Installing MicroPython on micro:bit... ${progressPercent}%`
              });
            },
          });

          // Allow USB stack to settle after flashing and board reset.
          await new Promise(resolve => setTimeout(resolve, 1500));
          setMicrobitInstallArmed(false);
          setStatusBanner({
            type: 'info',
            message: 'MicroPython install complete. Select micro:bit serial port...'
          });
        }
        await board.connect(replContainerRef.current, true, { boardType: targetBoard });

        // Ensure user code is interrupted before any post-connect setup.
        await board.interrupt(150);
        if (targetBoard === 'pico') {
          // Stop LilyBot motors/tasks on Pico only.
          await board.eval(STOP_CODE_LILYBOT, { hidden: true });
        }
        setConnectedBoard(targetBoard);
      } catch (error) {
        if (targetBoard === 'microbit' && shouldInstallMicrobitFirmware(error) && !microbitInstallArmed) {
          setMicrobitInstallArmed(true);
          const installMessage = 'MicroPython is missing on this micro:bit. Click Connect micro:bit again to install it.';
          setStatusBanner({
            type: 'info',
            message: installMessage
          });
          const terminal = board.terminal;
          if (terminal) terminal.write(`\r\n${installMessage}\r\n`);
          return;
        }
        console.error('Connection failed:', error);
        setConnected(false);
        setConnectedBoard(null);
        setMode('disconnected');
        setIsRunning(false);
        const message = getConnectionErrorMessage(error);
        setStatusBanner({
          type: 'error',
          message
        });
        const terminal = board.terminal;
        if (terminal) terminal.write(`\r\n${message}\r\n`);
      }
      finally {
        if (installerSession) {
          await installerSession.close();
        }
      }
    }
    finally {
      setIsConnecting(false);
    }
  };

  const handleRun = async () => {
    const board = boardRef.current;
    if (!board || !connected) return;

    const codeToRun = editorRef.current?.getCode() || currentCodeContent;
    
    // Create snapshot before running
    await createSnapshot('run_device');
    
    // Log interaction and code before running
    await logInteractionSafe('run_device');
    
    // Stop any running code first
    if (isRunning) {
      await handleCtrlC();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsRunning(true);
    try {
      await board.paste(codeToRun, { hidden: false });
      board.terminal?.focus();
    } catch (error) {
      console.error('Run failed:', error);
      setIsRunning(false);
    }
  };

  const handleCtrlC = async () => {
    const board = boardRef.current;
    if (!board || !connected) return;

    await logInteractionSafe('send_ctrl_c');

    setIsRunning(false);
    await board.interrupt();
    
    // Give a moment for buffer to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Stop motors for Pico only.
    if (connectedBoard === 'pico') {
      try {
        await board.eval(STOP_CODE_LILYBOT, { hidden: true });
      } catch (error) {
        console.error('Failed to stop motors:', error);
      }
    }
  };

  const handleReset = async () => {
    const board = boardRef.current;
    if (!board || !connected) return;

    await logInteractionSafe('reset_device');

    setIsRunning(false);
    await board.reset();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await board.interrupt();
    setMode('repl');
    board.terminal?.focus();
  };

  const handleClear = async () => {
    // Log interaction and console before clearing
    await logInteractionSafe('clear_console');
    await logConsoleSafe(buffer, 'clear_console');

    if (boardRef.current?.terminal) {
      boardRef.current.terminal.clear();
    }
    setBuffer('');
  };

  const handleSaveToMain = async () => {
    const board = boardRef.current;
    if (!board || !connected) {
      alert('Cannot save to main.py. Please connect to the Pico W first.');
      return;
    }

    const codeToSave = editorRef.current?.getCode() || currentCodeContent;
    
    // Create snapshot before saving to main.py
    await createSnapshot('save_to_main_py');
    
    // Log interaction before saving to main.py
    await logInteractionSafe('save_to_main_py');

    try {
      await board.upload('main.py', codeToSave);
      await board.reset();
      setMode('repl');
      board.terminal?.focus();
    } catch (error) {
      console.error('Failed to save to main.py:', error);
      alert(`Failed to save to main.py: ${error.message}`);
    }
  };

  return (
    <div className="spike-editor">
      <CodeTabs
        codeRecords={codeRecords}
        currentCodeId={currentCodeId}
        onSwitchCode={switchCode}
        onCreateCode={createNewCode}
        onRenameCode={updateCodeName}
      />
      <div className="parent" ref={containerRef}>
        <div className="child top-child">
          <div className="editor-wrapper">
            <CodeEditor
              ref={editorRef}
              initialCode={currentCodeContent}
              onChange={handleCodeChange}
            />
          </div>
        </div>

        <div className="resizer" ref={resizerRef}></div>

        <div className="child bottom-child">
          <div className="status-and-control-row">
            <ControlPanel
              connected={connected}
              connectedBoard={connectedBoard}
              isConnecting={isConnecting}
              onConnectMicrobit={() => handleConnect('microbit')}
              onConnectPico={() => handleConnect('pico')}
              onDisconnect={handleDisconnect}
              onRun={handleRun}
              onCtrlC={handleCtrlC}
              onReset={handleReset}
              onClear={handleClear}
              onSaveToMain={handleSaveToMain}
            />
            {!connected && (
              <div className={`status-banner ${statusBanner.type}`}>
                {statusBanner.message}
              </div>
            )}
          </div>
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

