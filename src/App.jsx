import { useRef, useEffect, useState } from 'react';
import './App.css';
import SPIKEEditor from './components/SPIKEEditor';
import ChatPanel from './components/ChatPanel';
import TitleBar from './components/TitleBar';
import DebugManager, { debugLog } from './components/DebugManager';

const CODE_STORAGE_KEY = 'coderobots_editor_code';

function App() {
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [editorCode, setEditorCode] = useState('# Start your project here!\n');
  const [isRobotConnected, setIsRobotConnected] = useState(false);

  const resizerRef = useRef(null);
  const containerRef = useRef(null);
  const spikeEditorRef = useRef(null);

  // Load code from localStorage on mount
  useEffect(() => {
    try {
      const savedCode = localStorage.getItem(CODE_STORAGE_KEY);
      if (savedCode) {
        setEditorCode(savedCode);
      }
    } catch (error) {
      console.warn('Failed to load code from localStorage:', error);
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
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const rect = container.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const percent = (offsetX / rect.width) * 100;

      // Constrain between 15% and 85%
      const constrainedPercent = Math.min(Math.max(percent, 15), 85);
      container.style.gridTemplateColumns = `${constrainedPercent}% 5px auto`;
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

  const handleReplaceCode = (newCode) => {
    setEditorCode(newCode);
    if (spikeEditorRef.current) {
      spikeEditorRef.current.setCode(newCode);
    }
    debugLog('Code replaced from AI suggestion');
  };

  const getCodeContent = async () => {
    if (spikeEditorRef.current) {
      return spikeEditorRef.current.getCode();
    }
    return editorCode;
  };

  const getConsoleContent = async () => {
    if (spikeEditorRef.current) {
      return spikeEditorRef.current.getBuffer();
    }
    return '';
  };

  return (
    <>
      <div className="app-container">
        <TitleBar 
          onShowDebug={() => setShowDebugModal(true)}
        />
        <div className="main-content" ref={containerRef}>
          <div className="left-panel">
            <SPIKEEditor 
              ref={spikeEditorRef}
              initialCode={editorCode}
              onConnectionChange={setIsRobotConnected}
            />
          </div>
          <div className="horizontal-resizer" ref={resizerRef}></div>
          <div className="right-panel">
            <ChatPanel
              onReplaceCode={handleReplaceCode}
              getCodeContent={getCodeContent}
              getConsoleContent={getConsoleContent}
              isRobotConnected={isRobotConnected}
            />
          </div>
        </div>
      </div>

      <DebugManager 
        visible={showDebugModal} 
        onClose={() => setShowDebugModal(false)} 
      />
    </>
  );
}

export default App;
