/**
 * TitleBar Component
 * Main navigation bar with session management, debug, and about features
 */

import { useState, useRef, useEffect } from 'react';
import AboutModal from './AboutModal';
import { signOut } from '../services/auth';
import instance from '../config/instance';
import { getPlatform } from '../platforms';
import { useLanguage } from '../contexts/LanguageContext';
import './ModalBase.css';
import './TitleBar.css';

const brand = instance.brand;

const TitleBar = ({
  onSaveSession,
  onOpenSessions,
  onShowDebug,
  onOpenHardwareConfig,
  activeSession,
  onUpdateSessionName,
}) => {
  const { lang, switchLang, t } = useLanguage();
  const [showAbout, setShowAbout] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameClick = () => {
    if (activeSession) {
      setEditedName(activeSession.name || '');
      setIsEditingName(true);
    }
  };

  const handleNameSave = async () => {
    if (activeSession && onUpdateSessionName) {
      await onUpdateSessionName(activeSession.id, editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
    }
  };

  const handleNameBlur = () => {
    handleNameSave();
  };

  const handleLogOut = async () => {
    try {
      await signOut();
      // The auth state listener will handle navigation/cleanup
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-logo">
          <img
            src={brand.logoSrc}
            alt={brand.logoAlt}
            style={{ height: brand.logoHeight }}
          />
        </div>
        <div className="topbar-title">{brand.name}</div>
        {activeSession && (
          <div className="topbar-session-name">
            {isEditingName ? (
              <input
                ref={inputRef}
                type="text"
                className="topbar-session-name-input"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={handleNameKeyDown}
                onBlur={handleNameBlur}
                placeholder={t('enterSessionName')}
                maxLength={100}
              />
            ) : (
              <div
                className="topbar-session-name-display"
                onClick={handleNameClick}
                title={t('renameSessionTitle')}
              >
                <span>{activeSession.name || t('unnamedSession')}</span>
              </div>
            )}
            {getPlatform(activeSession.hardware_platform) && (
              <span className="platform-badge" title={t('hardwarePlatform')}>
                {getPlatform(activeSession.hardware_platform).label}
              </span>
            )}
          </div>
        )}
        <div className="topbar-actions">
          {activeSession && onSaveSession && (
            <button 
              className="topbar-button save" 
              onClick={onSaveSession}
              title={t('saveSessionTitle')}
            >
              {t('saveSession')}
            </button>
          )}
          {onOpenSessions && (
            <button
              className="topbar-button"
              onClick={onOpenSessions}
              title={t('editorSessionsTitle')}
            >
              {t('editorSessions')}
            </button>
          )}
          {onOpenHardwareConfig && activeSession?.hardware_platform === 'lilybot' && (
            <button
              className="topbar-button"
              onClick={onOpenHardwareConfig}
              title={t('configureHardwareTitle')}
            >
              {t('configureHardware')}
            </button>
          )}
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
            className="topbar-button logout"
            onClick={handleLogOut}
            title={t('logOutTitle')}
          >
            {t('logOut')}
          </button>
          {instance.locales.available.length > 1 && (
            <div className="topbar-lang-toggle">
              {instance.locales.available.map((code) => (
                <button
                  key={code}
                  className={`topbar-lang-btn${lang === code ? ' topbar-lang-btn--active' : ''}`}
                  onClick={() => switchLang(code)}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <AboutModal visible={showAbout} onClose={() => setShowAbout(false)} />
    </>
  );
};

export default TitleBar;

