import { useLanguage } from '../contexts/LanguageContext';

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
}) => {
  const isMicrobit = hardware === 'microbit';
  const isLegoEducation = hardware === 'lego-education';
  const isEsp32 = hardware === 'esp32';
  const { t } = useLanguage();

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
        <button onClick={onClear} className="button">
          {t('clearConsole')}
        </button>
        {isLegoEducation && (
          <>
            <button onClick={onRun} className="button repl-action" disabled={isRunning}>
              {t('runProgram')}
            </button>
            <button onClick={onCtrlC} className="button repl-action">
              {t('stopProgram')}
            </button>
          </>
        )}
      </div>

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
    </div>
  );
};

export default ControlPanel;
