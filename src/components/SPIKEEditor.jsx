import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import Board from '../utils/microRepl.js';
import { STOP_CODE } from '../utils/stopSpike.js';
import CodeEditor from './CodeEditor.jsx';
import ControlPanel from './ControlPanel.jsx';
import CodeTabs from './CodeTabs.jsx';
import { useSession } from '../contexts/SessionContext';
import { logConsole, logInteraction } from '../services/dataLogger';
import './SPIKEEditor.css';

const FIFO_SIZE = 10000;


const SPIKEEditor = forwardRef(({ sessionId }, ref) => {
  const [connected, setConnected] = useState(false);
  const [mode, setMode] = useState('disconnected');
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [buffer, setBuffer] = useState('');

  const { 
    codeRecords, 
    currentCodeId, 
    currentCodeContent,
    switchCode, 
    createNewCode, 
    updateCodeName,
    updateCurrentCodeContent,
    createSnapshot
  } = useSession();

  const editorRef = useRef(null);
  const terminalRef = useRef(null);
  const boardRef = useRef(null);
  const replContainerRef = useRef(null);
  const resizerRef = useRef(null);
  const containerRef = useRef(null);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getCode: () => editorRef.current?.getCode() || currentCodeContent,
    getBuffer: () => buffer,
  }));

  // Update code editor when current code content changes (from session load or tab switch)
  useEffect(() => {
    if (editorRef.current?.setCode) {
      editorRef.current.setCode(currentCodeContent);
    }
  }, [currentCodeContent]);

  // Handle code changes in the editor (local state only, no database save)
  const handleCodeChange = (newCode) => {
    // Update local state only - no database save on every keystroke
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
          setConnected(true);
          setMode('repl');
        },
        ondisconnect: () => {
          console.log('Device disconnected');
          setConnected(false);
          setMode('disconnected');
          setBuffer('');
          setIsRunning(false);
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

  const handleConnect = async () => {
    const board = boardRef.current;
    if (!board) return;

    if (connected) {
      // Disconnect
      if (sessionId) {
        await logInteraction('disconnect', sessionId);
      }
      await board.reset();
      await board.disconnect();
    } else {
      // Connect
      if (sessionId) {
        await logInteraction('connect', sessionId);
      }
      try {
        await board.connect(replContainerRef.current, true);
      } catch (error) {
        console.error('Connection failed:', error);
        if (terminalRef.current) {
          terminalRef.current.write(`\r\nConnection failed: ${error.message}\r\n`);
        }
      }
    }
  };

  const handleRun = async () => {
    const board = boardRef.current;
    if (!board || !connected) return;

    const codeToRun = editorRef.current?.getCode() || currentCodeContent;
    
    // Create snapshot before running
    await createSnapshot('run_device');
    
    // Log interaction and code before running
    if (sessionId) {
      await logInteraction('run_device', sessionId);
    }
    
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

    if (sessionId) {
      await logInteraction('send_ctrl_c', sessionId);
    }

    setIsRunning(false);
    await board.write('\x03');
    
    // Give a moment for buffer to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Stop motors
    try {
      await board.eval(STOP_CODE, { hidden: true });
    } catch (error) {
      console.error('Failed to stop motors:', error);
    }
  };

  const handleReset = async () => {
    const board = boardRef.current;
    if (!board || !connected) return;

    if (sessionId) {
      await logInteraction('reset_device', sessionId);
    }

    setIsRunning(false);
    await board.reset();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await board.write('\x03');
    setMode('repl');
    board.terminal?.focus();
  };

  const handleClear = async () => {
    // Log interaction and console before clearing
    if (sessionId) {
      await logInteraction('clear_console', sessionId);
      if (buffer) {
        await logConsole(buffer, sessionId, 'clear_console');
      }
    }
    
    if (terminalRef.current) {
      terminalRef.current.clear();
    }
    if (boardRef.current?.terminal) {
      boardRef.current.terminal.clear();
    }
    setBuffer('');
  };

  const handleEnterREPL = async () => {
    const board = boardRef.current;
    if (!board || !connected) return;

    if (sessionId) {
      await logInteraction('switch_to_repl_mode', sessionId);
    }

    await board.write('\x03');
    setMode('repl');
  };

  const handleEnterProgramSlot = async () => {
    const board = boardRef.current;
    if (!board || !connected) return;

    if (sessionId) {
      await logInteraction('switch_to_program_slot_mode', sessionId);
    }

    setIsRunning(false);
    await board.reset();
    setMode('program-slot');
    board.terminal?.focus();
  };

  const handleSaveToSlot = async () => {
    const board = boardRef.current;
    if (!board || !connected) {
      alert('Cannot save to slot. Please connect to a SPIKE hub first.');
      return;
    }

    const codeToSave = editorRef.current?.getCode() || currentCodeContent;
    
    // Create snapshot before saving to slot
    await createSnapshot(`save_to_slot_${selectedSlot}`);
    
    // Log interaction and code before saving to slot
    if (sessionId) {
      await logInteraction(`save_to_slot_${selectedSlot}`, sessionId);
    }
    
    const slotStr = String(selectedSlot).padStart(2, '0');
    
    console.log(`Saving code to SPIKE program slot ${selectedSlot}...`);

    // Escape the code content to be a valid Python string literal
    const escapedCode = JSON.stringify(codeToSave);

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

# Write the new program file
with open(target_file, "w") as f:
    length = f.write(code_to_write)

# Try to return to the root directory
os.chdir('/flash')
`;

    try {
      await board.paste(script);
      await board.reset();
      setMode('program-slot');
      board.terminal?.focus();
    } catch (error) {
      console.error('Failed to save to slot:', error);
      alert(`Failed to save to slot: ${error.message}`);
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

