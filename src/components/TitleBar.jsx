/**
 * TitleBar Component
 * Main navigation bar with session management, debug, and about features
 */

import { useState } from 'react';
import AboutModal from './AboutModal';
import AIUsageModal from './AIUsageModal';
import './TitleBar.css';

const TitleBar = ({ onSaveSession, onOpenSessions, onShowDebug, activeSession }) => {
  const [showAbout, setShowAbout] = useState(false);
  const [showAIUsage, setShowAIUsage] = useState(false);

  return (
    <>
      <div className="topbar">
        <div className="topbar-logo">
          <span className="logo-text">Tufts CEEO</span>
        </div>
        <div className="topbar-title">EN1 AI Editor</div>
        <div className="topbar-actions">
          {activeSession && onSaveSession && (
            <button 
              className="topbar-button save" 
              onClick={onSaveSession}
              title="Save current code and console"
            >
              SAVE SESSION
            </button>
          )}
          {onOpenSessions && (
            <button 
              className="topbar-button" 
              onClick={onOpenSessions}
              title="Switch between editor sessions"
            >
              EDITOR SESSIONS
            </button>
          )}
          <button 
            className="topbar-button" 
            onClick={() => setShowAIUsage(true)}
            title="View AI usage statistics"
          >
            AI USAGE
          </button>
          <button 
            className="topbar-button" 
            onClick={() => setShowAbout(true)}
            title="About this application"
          >
            ABOUT
          </button>
          {onShowDebug && (
            <button 
              className="topbar-button" 
              onClick={onShowDebug}
              title="Open debug console"
            >
              DEBUG
            </button>
          )}
        </div>
      </div>

      <AboutModal visible={showAbout} onClose={() => setShowAbout(false)} />
      <AIUsageModal visible={showAIUsage} onClose={() => setShowAIUsage(false)} />
    </>
  );
};

export default TitleBar;

