/**
 * TitleBar Component
 * Main navigation bar with session management, debug, and about features
 */

import { useState } from 'react';
import AboutModal from './AboutModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useHardware } from '../contexts/HardwareContext';
import './TitleBar.css';

const TitleBar = ({ onShowDebug, onClearChat }) => {
  const [showAbout, setShowAbout] = useState(false);
  const { lang, switchLang, t } = useLanguage();
  const { hardware, switchHardware } = useHardware();

  const handleHardwareSwitch = (newHw) => {
    if (newHw === hardware) return;
    if (confirm(t('switchHardwareConfirm'))) {
      switchHardware(newHw);
      onClearChat?.();
    }
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">{t('appTitle')}</div>
        <div className="topbar-actions">
          <button
            className="topbar-button"
            onClick={() => setShowAbout(true)}
            title={t('aboutTitle')}
          >
            {t('about')}
          </button>
          {onShowDebug && (
            <button
              className="topbar-button"
              onClick={onShowDebug}
              title={t('debugTitle')}
            >
              {t('debug')}
            </button>
          )}
          <div className="topbar-hw-toggle">
            <button
              className={`topbar-lang-btn${hardware === 'spike' ? ' topbar-lang-btn--active' : ''}`}
              onClick={() => handleHardwareSwitch('spike')}
            >
              SPIKE
            </button>
            <button
              className={`topbar-lang-btn${hardware === 'microbit' ? ' topbar-lang-btn--active' : ''}`}
              onClick={() => handleHardwareSwitch('microbit')}
            >
              micro:bit
            </button>
          </div>
          <div className="topbar-lang-toggle">
            <button
              className={`topbar-lang-btn${lang === 'da' ? ' topbar-lang-btn--active' : ''}`}
              onClick={() => switchLang('da')}
            >
              DA
            </button>
            <button
              className={`topbar-lang-btn${lang === 'en' ? ' topbar-lang-btn--active' : ''}`}
              onClick={() => switchLang('en')}
            >
              EN
            </button>
          </div>
        </div>
      </div>

      <AboutModal visible={showAbout} onClose={() => setShowAbout(false)} />
    </>
  );
};

export default TitleBar;
