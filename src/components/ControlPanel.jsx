const ControlPanel = ({
  connected,
  onConnect,
  onRun,
  onCtrlC,
  onReset,
  onClear,
  onSaveToMain
}) => {
  return (
    <div className="control-panel right-panel">
      <div className="button-group">
        <button
          onClick={onConnect}
          className={`button ${connected ? 'disconnect-button' : 'connect-button'}`}
        >
          {connected ? 'Disconnect' : 'Connect'}
        </button>
        <button onClick={onClear} className="button clear-console-button">
          Clear Console
        </button>
      </div>

      {connected && (
        <div className="button-group">
          <button onClick={onRun} className="button run-button">
            ▶ Run Program
          </button>
          <button onClick={onSaveToMain} className="button run-button">
            Save to main.py
          </button>
          <button onClick={onCtrlC} className="button stop-button">
            Stop Program
          </button>
          <button onClick={onReset} className="button stop-button">
            Reset Device
          </button>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;

