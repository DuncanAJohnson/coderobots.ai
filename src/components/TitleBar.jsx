/**
 * TitleBar Component
 * Main navigation bar with session management, debug, and about features
 */

import { useState } from 'react';
import AboutModal from './AboutModal';
import HardwarePickerModal from './HardwarePickerModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useHardware } from '../contexts/HardwareContext';
import './TitleBar.css';

const HW_LABEL_KEY = {
  microbit: 'microbit',
  spike: 'spikePrime',
  esp32: 'esp32',
  'lego-education': 'legoEducation',
};

const TitleBar = ({ onShowDebug, onClearChat }) => {
  const [showAbout, setShowAbout] = useState(false);
  const [showHardwarePicker, setShowHardwarePicker] = useState(false);
  const [hardwareHovered, setHardwareHovered] = useState(false);
  const { lang, switchLang, t } = useLanguage();
  const { hardware } = useHardware();

  const hardwareLabel = hardware && HW_LABEL_KEY[hardware] ? t(HW_LABEL_KEY[hardware]) : null;
  const showHardware = hardwareLabel && !hardwareHovered;

  const handleHardwarePickerClose = () => {
    setShowHardwarePicker(false);
    onClearChat?.();
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">
          {t('appTitlePrefix')}{' '}
          <span
            className={`topbar-title-swap${showHardware ? ' topbar-title-swap--hw' : ''}`}
            onMouseEnter={() => setHardwareHovered(true)}
            onMouseLeave={() => setHardwareHovered(false)}
          >
            <span className="topbar-title-swap-layer topbar-title-swap-layer--robots" aria-hidden={showHardware}>
              {t('appTitleRobots')}
            </span>
            {hardwareLabel && (
              <span className="topbar-title-swap-layer topbar-title-swap-layer--hw" aria-hidden={!showHardware}>
                {hardwareLabel}
              </span>
            )}
          </span>{' '}
          {t('appTitleSuffix')}
        </div>
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
