/**
 * TitleBar Component
 * Main navigation bar with session management, debug, and about features
 */

import { useState } from 'react';
import AboutModal from './AboutModal';
import './TitleBar.css';

const TitleBar = ({ onShowDebug }) => {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Code Robots with SkoleGPT</div>
        <div className="topbar-actions">
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
    </>
  );
};

export default TitleBar;

