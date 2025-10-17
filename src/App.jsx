import { useRef, useEffect, useState } from 'react';
import './App.css';
import SPIKEEditor from './components/SPIKEEditor';
import ChatPanel from './components/ChatPanel';
import AuthModal from './components/AuthModal';
import SessionModal from './components/SessionModal';
import TitleBar from './components/TitleBar';
import DebugManager, { debugLog } from './components/DebugManager';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SessionProvider, useSession } from './contexts/SessionContext';
import { logConsole } from './services/dataLogger';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { activeSession, sessions, loadSessions, setActiveSessionById, updateSessionName, currentCodeContent, updateCurrentCodeContent, createSnapshot } = useSession();
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionModalCancellable, setSessionModalCancellable] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [sessionsInitialized, setSessionsInitialized] = useState(false);

  const resizerRef = useRef(null);
  const containerRef = useRef(null);
  const spikeEditorRef = useRef(null);

  // Show auth modal if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      setShowAuthModal(true);
    } else {
      setShowAuthModal(false);
    }
  }, [user, authLoading]);

  // Load sessions and show session modal when authenticated (only once)
  useEffect(() => {
    if (user && !authLoading && !sessionsInitialized) {
      loadSessions().then((userSessions) => {
        if (userSessions && userSessions.length > 0) {
          // Show session modal (non-cancellable on first load)
          setSessionModalCancellable(false);
          setShowSessionModal(true);
        } else {
          // Auto-create new session if none exist
          setActiveSessionById('new');
        }
        setSessionsInitialized(true);
      });
    }
  }, [user, authLoading, sessionsInitialized, loadSessions, setActiveSessionById]);

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
  }, [user, activeSession]);

  const handleSessionSelect = async (sessionId) => {
    setShowSessionModal(false);
    await setActiveSessionById(sessionId);
  };

  const handleReplaceCode = async (newCode) => {
    // Create snapshot for AI replacement with the new code
    await createSnapshot('ai_replace', newCode);
    
    // Update the current code in session context (local state)
    await updateCurrentCodeContent(newCode);
  };

  const getCodeContent = async () => {
    if (spikeEditorRef.current) {
      return spikeEditorRef.current.getCode();
    }
    return currentCodeContent;
  };

  const getConsoleContent = async () => {
    if (spikeEditorRef.current) {
      return spikeEditorRef.current.getBuffer();
    }
    return '';
  };

  const openSessionSelector = async () => {
    await loadSessions();
    setSessionModalCancellable(true);
    setShowSessionModal(true);
  };

  const handleSaveSession = async () => {
    if (!activeSession?.id) {
      debugLog('Cannot save: No active session');
      return;
    }

    try {
      // Create code snapshot for manual save
      await createSnapshot('manual_save');
      
      // Get current code and console content
      const currentConsole = await getConsoleContent();

      // Log console
      if (currentConsole) {
        await logConsole(currentConsole, activeSession.id, 'manual_save');
        debugLog(`Saved console (${currentConsole.length} characters)`);
      }

      debugLog('✅ Session saved successfully');
    } catch (error) {
      console.error('Error saving session:', error);
      debugLog(`❌ Error saving session: ${error.message}`);
    }
  };

  if (authLoading) {
    return (
      <div className="app-container">
        <TitleBar />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthModal visible={showAuthModal} />
        <div className="app-container">
          <TitleBar 
            onShowDebug={() => setShowDebugModal(true)}
          />
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <p>Please sign in to continue</p>
          </div>
        </div>
        <DebugManager 
          visible={showDebugModal} 
          onClose={() => setShowDebugModal(false)} 
        />
      </>
    );
  }

  return (
    <>
      <SessionModal
        visible={showSessionModal}
        sessions={sessions}
        onSelect={handleSessionSelect}
        cancellable={sessionModalCancellable}
        onCancel={() => setShowSessionModal(false)}
      />
      
      <div className="app-container">
        <TitleBar 
          onSaveSession={handleSaveSession}
          onOpenSessions={openSessionSelector}
          onShowDebug={() => setShowDebugModal(true)}
          activeSession={activeSession}
          onUpdateSessionName={updateSessionName}
        />
        <div className="main-content" ref={containerRef}>
          <div className="left-panel">
            <SPIKEEditor 
              ref={spikeEditorRef}
              sessionId={activeSession?.id}
            />
          </div>
          <div className="horizontal-resizer" ref={resizerRef}></div>
          <div className="right-panel">
            <ChatPanel
              onReplaceCode={handleReplaceCode}
              getCodeContent={getCodeContent}
              getConsoleContent={getConsoleContent}
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

function App() {
  return (
    <AuthProvider>
      <SessionProvider>
        <AppContent />
      </SessionProvider>
    </AuthProvider>
  );
}

export default App;
