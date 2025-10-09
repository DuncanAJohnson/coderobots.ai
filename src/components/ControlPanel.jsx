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
  onSaveToSlot
}) => {
  return (
    <div className={`control-panel right-panel ${mode}-mode`}>
      <div className="mode-status">
        Status: <span className="mode-indicator">
          {mode === 'disconnected' && 'Disconnected'}
          {mode === 'repl' && 'REPL Mode'}
          {mode === 'program-slot' && 'Program Slot Mode'}
        </span>
      </div>

      <div className="button-group">
        <button onClick={onConnect} className="button">
          {connected ? 'Disconnect' : 'Connect'}
        </button>
        <button onClick={onEnterREPL} className="button program-slot-only">
          Enter REPL Mode
        </button>
        <button onClick={onEnterProgramSlot} className="button repl-only">
          Enter Program Slot Mode
        </button>
        <button onClick={onClear} className="button">
          Clear Console
        </button>
      </div>

      <div className="button-group repl-only">
        <button onClick={onRun} className="button">
          ▶ Run Program
        </button>
        <button onClick={onCtrlC} className="button">
          Stop Program
        </button>
        <button onClick={onReset} className="button">
          Reset Device
        </button>
        <div className="vertical-line"></div>
        <select 
          value={selectedSlot} 
          onChange={(e) => onSlotChange(e.target.value)}
          className="button slot-selector"
          title="Select program slot to save to"
        >
          {[...Array(20)].map((_, i) => (
            <option key={i} value={i}>Slot {i}</option>
          ))}
        </select>
        <button onClick={onSaveToSlot} className="button">
          Save to Slot
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;

