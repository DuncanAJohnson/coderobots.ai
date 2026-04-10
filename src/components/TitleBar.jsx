/**
 * TitleBar Component
 * Main navigation bar with session management, debug, and about features
 */

import { useState } from 'react';
import AboutModal from './AboutModal';
import HardwarePickerModal from './HardwarePickerModal';
import { useLanguage } from '../contexts/LanguageContext';
import './TitleBar.css';

const TitleBar = ({ onShowDebug, onClearChat }) => {
  const [showAbout, setShowAbout] = useState(false);
  const [showHardwarePicker, setShowHardwarePicker] = useState(false);
  const { lang, switchLang, t } = useLanguage();

  const handleHardwarePickerClose = () => {
    setShowHardwarePicker(false);
    onClearChat?.();
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
          <button
            className="topbar-button"
            onClick={() => setShowHardwarePicker(true)}
          >
            {t('switchHardware')}
          </button>
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
      <HardwarePickerModal
        visible={showHardwarePicker}
        onClose={handleHardwarePickerClose}
        dismissable
      />
    </>
  );
};

export default TitleBar;
