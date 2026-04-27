import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import LegoCardPickerModal from './LegoCardPickerModal';
import './ControlPanel.css';

const KIND_LETTER = {
  singlemotor: 'S',
  doublemotor: 'D',
  colorsensor: 'C',
  controller: 'R',
};

const KIND_LABEL_KEY = {
  singlemotor: 'legoSingleMotor',
  doublemotor: 'legoDoubleMotor',
  colorsensor: 'legoColorSensor',
  controller: 'legoController',
};

const KIND_ORDER = ['singlemotor', 'doublemotor', 'colorsensor', 'controller'];

const LegoDeviceIcon = ({ kind, letter, devices, label, onRename, onDisconnect, onAddRequest, t }) => {
  const wrapperRef = useRef(null);
  const popoverRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, bottom: 0 });
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  // Position the portal popover above the icon, anchored via fixed coords.
  useLayoutEffect(() => {
    if (!open || !wrapperRef.current) return;
    const update = () => {
      const r = wrapperRef.current.getBoundingClientRect();
      setPos({ left: r.left, bottom: window.innerHeight - r.top + 4 });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  // Click-outside closes immediately.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (wrapperRef.current?.contains(e.target)) return;
      if (popoverRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Cancel any pending close on unmount.
  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setOpen(false);
    }, 200);
  };

  const startEdit = (name) => { setEditing({ name }); setDraft(name); setError(''); };
  const commitEdit = () => {
    if (!editing) return;
    const result = onRename(kind, editing.name, draft);
    if (result?.ok === false) {
      setError(result.error === 'in-use' ? t('legoRenameError') : (result.error || ''));
      return;
    }
    setEditing(null); setDraft(''); setError('');
  };
  const cancelEdit = () => { setEditing(null); setDraft(''); setError(''); };

  const handleAdd = () => {
    setError('');
    setOpen(false);
    onAddRequest(kind);
  };

  const count = devices.length;

  return (
    <div
      ref={wrapperRef}
      className="lego-icon-wrapper"
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
      onFocus={() => { cancelClose(); setOpen(true); }}
      onBlur={(e) => {
        const next = e.relatedTarget;
        if (next && (wrapperRef.current?.contains(next) || popoverRef.current?.contains(next))) return;
        scheduleClose();
      }}
    >
      <button
        type="button"
        className={`lego-icon-button${count > 0 ? ' lego-icon-button--has' : ''}`}
        title={label}
      >
        <span className="lego-icon-letter">{letter}</span>
        <span className="lego-icon-count">{count}</span>
      </button>
      {open && createPortal(
        <div
          ref={popoverRef}
          className="lego-icon-popover"
          role="dialog"
          style={{ left: pos.left, bottom: pos.bottom }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="lego-icon-popover-header">
            <div className="lego-icon-popover-title">{label}</div>
            <button
              type="button"
              className="lego-icon-popover-add"
              onClick={handleAdd}
              title={t('legoAddDevice')}
            >
              +
            </button>
          </div>
          {devices.length === 0 ? (
            <div className="lego-icon-popover-empty">{t('legoNoDevicesOfType')}</div>
          ) : (
            <ul className="lego-icon-popover-list">
              {devices.map((d) => {
                const isEditing = editing?.name === d.name;
                return (
                  <li key={d.name} className="lego-icon-popover-row">
                    <div className="lego-icon-popover-row-id">
                      <span className="lego-icon-popover-id-label">{t('legoDeviceIdLabel')}=</span>
                      {isEditing ? (
                        <input
                          autoFocus
                          className="lego-icon-popover-id-input"
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit();
                            else if (e.key === 'Escape') cancelEdit();
                          }}
                          onBlur={commitEdit}
                        />
                      ) : (
                        <button
                          type="button"
                          className="lego-icon-popover-id-value"
                          onClick={() => startEdit(d.name)}
                          title={t('legoDeviceIdLabel')}
                        >
                          {d.name}
                        </button>
                      )}
                      <button
                        type="button"
                        className="lego-icon-popover-disconnect"
                        onClick={() => onDisconnect(kind, d.name)}
                        title={t('disconnect')}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {error && <div className="lego-icon-popover-error">{error}</div>}
        </div>,
        document.body
      )}
    </div>
  );
};

const ControlPanel = ({
  connected,
  mode,
  selectedSlot,
  onSlotChange,
  onConnect,
  onRun,
  onCtrlC,
  onReset,
  onClear,
  onEnterREPL,
  onEnterProgramSlot,
  onSaveToSlot,
  hardware,
  onSaveToMainPy,
  isRunning,
  legoConnectionState,
  onConnectDevice,
  onRenameDevice,
  onDisconnectDevice,
}) => {
  const isMicrobit = hardware === 'microbit';
  const isLegoEducation = hardware === 'lego-education';
  const isEsp32 = hardware === 'esp32';
  const { t } = useLanguage();
  const [cardPickerKind, setCardPickerKind] = useState(null);

  const connectedLabel = isMicrobit
    ? t('microbitConnected')
    : isEsp32
    ? t('esp32Connected')
    : isLegoEducation
    ? t('legoEducationConnected')
    : t('replMode');

  return (
    <div className={`control-panel right-panel ${mode}-mode`}>
      <div className="mode-status">
        {t('statusLabel')}<span className="mode-indicator">
          {mode === 'disconnected' && t('disconnected')}
          {mode === 'repl' && connectedLabel}
          {mode === 'program-slot' && t('programSlotMode')}
        </span>
      </div>

      <div className="button-group">
        {!isLegoEducation && (
          <button onClick={onConnect} className="button">
            {connected ? t('disconnect') : t('connect')}
          </button>
        )}
        {isLegoEducation && (
          <div className="lego-icon-row">
            {KIND_ORDER.map((kind) => (
              <LegoDeviceIcon
                key={kind}
                kind={kind}
                letter={KIND_LETTER[kind]}
                label={t(KIND_LABEL_KEY[kind])}
                devices={legoConnectionState?.[kind] || []}
                onAddRequest={setCardPickerKind}
                onRename={onRenameDevice}
                onDisconnect={onDisconnectDevice}
                t={t}
              />
            ))}
          </div>
        )}
        {!isMicrobit && !isLegoEducation && !isEsp32 && (
          <button onClick={onEnterREPL} className="button program-slot-only">
            {t('enterRepl')}
          </button>
        )}
        {!isMicrobit && !isLegoEducation && !isEsp32 && (
          <button onClick={onEnterProgramSlot} className="button repl-only">
            {t('enterProgramSlot')}
          </button>
        )}
        {!isLegoEducation && (
          <button onClick={onClear} className="button">
            {t('clearConsole')}
          </button>
        )}
      </div>

      {isLegoEducation && (
        <div className="button-group">
          <button onClick={onClear} className="button">
            {t('clearConsole')}
          </button>
          <button onClick={onRun} className="button repl-action" disabled={isRunning}>
            {t('runProgram')}
          </button>
          <button onClick={onCtrlC} className="button repl-action">
            {t('stopProgram')}
          </button>
        </div>
      )}

      <div className="button-group repl-only">
        {!isLegoEducation && (
          <button onClick={onRun} className="button" disabled={isRunning}>
            {isEsp32 ? t('esp32CompileAndUpload') : t('runProgram')}
          </button>
        )}
        {!isLegoEducation && (
          <button onClick={onCtrlC} className="button">
            {t('stopProgram')}
          </button>
        )}
        {!isLegoEducation && (
          <button onClick={onReset} className="button">
            {t('resetDevice')}
          </button>
        )}
        {!isLegoEducation && <div className="vertical-line"></div>}
        {isLegoEducation ? null : (isMicrobit || isEsp32) ? (
          <></>
        ) : (
          <>
            <select
              value={selectedSlot}
              onChange={(e) => onSlotChange(e.target.value)}
              className="button slot-selector"
              title={t('slotSelectorTitle')}
            >
              {[...Array(20)].map((_, i) => (
                <option key={i} value={i}>{t('slot')} {i}</option>
              ))}
            </select>
            <button onClick={onSaveToSlot} className="button">
              {t('saveToSlot')}
            </button>
          </>
        )}
      </div>

      <LegoCardPickerModal
        visible={cardPickerKind != null}
        kind={cardPickerKind}
        kindLabel={cardPickerKind ? t(KIND_LABEL_KEY[cardPickerKind]) : ''}
        onConnect={onConnectDevice}
        onClose={() => setCardPickerKind(null)}
      />
    </div>
  );
};

export default ControlPanel;
