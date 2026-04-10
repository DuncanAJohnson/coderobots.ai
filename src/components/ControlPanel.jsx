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
}) => {
  const isMicrobit = hardware === 'microbit';
  const { t } = useLanguage();

  return (
    <div className={`control-panel right-panel ${mode}-mode`}>
      <div className="mode-status">
        {t('statusLabel')}<span className="mode-indicator">
          {mode === 'disconnected' && t('disconnected')}
          {mode === 'repl' && t('replMode')}
          {mode === 'program-slot' && t('programSlotMode')}
        </span>
      </div>

      <div className="button-group">
        <button onClick={onConnect} className="button">
          {connected ? t('disconnect') : t('connect')}
        </button>
        {!isMicrobit && (
          <button onClick={onEnterREPL} className="button program-slot-only">
            {t('enterRepl')}
          </button>
        )}
        {!isMicrobit && (
          <button onClick={onEnterProgramSlot} className="button repl-only">
            {t('enterProgramSlot')}
          </button>
        )}
        <button onClick={onClear} className="button">
          {t('clearConsole')}
        </button>
      </div>

      <div className="button-group repl-only">
        <button onClick={onRun} className="button">
          {t('runProgram')}
        </button>
        <button onClick={onCtrlC} className="button">
          {t('stopProgram')}
        </button>
        <button onClick={onReset} className="button">
          {t('resetDevice')}
        </button>
        <div className="vertical-line"></div>
        {isMicrobit ? (
          // <button onClick={onSaveToMainPy} className="button">
          //   {t('saveToMainPy')}
          // </button>
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
