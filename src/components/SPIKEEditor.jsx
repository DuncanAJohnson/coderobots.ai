import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import Board from '../utils/microRepl.js';
import { STOP_CODE_LILYBOT } from '../utils/stopSpike.js';
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
  const [buffer, setBuffer] = useState('');

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
  const terminalRef = useRef(null);
  const boardRef = useRef(null);
  const replContainerRef = useRef(null);
  const resizerRef = useRef(null);
  const containerRef = useRef(null);
  const isLocalChangeRef = useRef(false);

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
      await board.eval(STOP_CODE_LILYBOT, { hidden: true });
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

  // TODO: Implement this for raspberry pi pico
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
    if (sessionId) {
      await logInteraction('save_to_main_py', sessionId);
    }

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
          <ControlPanel
            connected={connected}
            onConnect={handleConnect}
            onRun={handleRun}
            onCtrlC={handleCtrlC}
            onReset={handleReset}
            onClear={handleClear}
            onSaveToMain={handleSaveToMain}
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

