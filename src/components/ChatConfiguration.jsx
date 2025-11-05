/**
 * Chat Configuration Component
 * Contains controls for coding level, AI model selection, and documentation attachment
 */

import './ChatConfiguration.css';

const ChatConfiguration = ({ 
  codingLevel, 
  onCodingLevelChange,
  selectedModel,
  onModelChange,
  attachDocumentation,
  onAttachDocumentationChange,
  streamingModels 
}) => {
  return (
    <div className="chat-configuration">
      <div className="config-left">
        <label htmlFor="coding-level-selector">Coding Level:</label>
        <select
          id="coding-level-selector"
          className="chat-level-selector"
          value={codingLevel}
          onChange={(e) => onCodingLevelChange(e.target.value)}
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="experienced">Experienced</option>
        </select>

        <label htmlFor="model-selector" style={{ marginLeft: '15px' }}>AI Model:</label>
        <select
          id="model-selector"
          className="chat-level-selector"
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
        >
          <option value="gpt-5-nano">gpt-5-nano (streaming)</option>
          <option value="gpt-5-mini">gpt-5-mini (full response)</option>
          <option value="gpt-5">gpt-5 (full response)</option>
        </select>
        {!streamingModels.has(selectedModel) && (
          <span style={{ marginLeft: '10px', fontSize: '0.85em', color: '#666' }}>
            ⏱️ This model waits for the full response
          </span>
        )}
      </div>

      <div className="config-right">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={attachDocumentation}
            onChange={(e) => onAttachDocumentationChange(e.target.checked)}
          />
          <span>Attach SPIKE PRIME documentation as context</span>
        </label>
        <div className="info-tooltip">
          <span className="info-icon">ℹ️</span>
          <span className="tooltip-text">
            By attaching the full documentation, the LLM will have more knowledge of how SPIKE PRIMEs are programmed, but the response speed will be slower and the cost of messaging with the LLM will be higher.
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatConfiguration;

