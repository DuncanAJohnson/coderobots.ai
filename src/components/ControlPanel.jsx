import { useLanguage } from '../contexts/LanguageContext';

const ControlPanel = ({
  connected,
  connectedBoard = null,
  platformConnectionType = null,
  isConnecting = false,
  onConnectMicrobit,
  onConnectPico,
  onConnectEsp32,
  onDisconnect,
  onRun,
  onCtrlC,
  onReset,
  onClear,
  onSaveToMain,
  onDownload,
  onClearDownload,
  onClearMain
}) => {
  const { t } = useLanguage();
  return (
    <div className="control-panel right-panel">
      <div className="button-group">
        {connected ? (
          <button
            onClick={onDisconnect}
            className="button disconnect-button"
            disabled={isConnecting}
          >
            {isConnecting ? t('disconnecting') : t('disconnect')}
          </button>
        ) : (
          <>
            {platformConnectionType === 'microbit' && (
              <button
                onClick={onConnectMicrobit}
                className="button connect-button"
                disabled={isConnecting}
              >
                {isConnecting ? t('legoConnecting') : t('connectMicrobit')}
              </button>
            )}
            {platformConnectionType === 'pico' && (
              <button
                onClick={onConnectPico}
                className="button connect-button"
                disabled={isConnecting}
              >
                {isConnecting ? t('legoConnecting') : t('connectPico')}
              </button>
            )}
            {platformConnectionType === 'esp32' && (
              <button
                onClick={onConnectEsp32}
                className="button connect-button"
                disabled={isConnecting}
              >
                {isConnecting ? t('legoConnecting') : t('connectEsp32')}
              </button>
            )}
          </>
        )}
        <button onClick={onClear} className="button clear-console-button" disabled={isConnecting}>
          {t('clearConsole')}
        </button>
      </div>

      {connected && (
        <div className="button-group">
          <button onClick={onRun} className="button run-button">
            {t('runProgram')}
          </button>
          {connectedBoard === 'pico' && (
            <button onClick={onSaveToMain} className="button run-button">
              {t('saveToMainPy')}
            </button>
          )}
          {connectedBoard === 'microbit' && (
            <button onClick={onDownload} className="button run-button">
              {t('download')}
            </button>
          )}
          {connectedBoard === 'microbit' && (
            <button onClick={onClearDownload} className="button clear-console-button">
              {t('clearDownload')}
            </button>
          )}
          {connectedBoard === 'esp32' && (
            <button onClick={onSaveToMain} className="button run-button">
              {t('saveToMainPy')}
            </button>
          )}
          {connectedBoard === 'esp32' && (
            <button onClick={onClearMain} className="button clear-console-button">
              {t('clearMainPy')}
            </button>
          )}
          <button onClick={onCtrlC} className="button stop-button">
            {t('stopProgram')}
          </button>
          <button onClick={onReset} className="button stop-button">
            {t('resetDevice')}
          </button>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;

