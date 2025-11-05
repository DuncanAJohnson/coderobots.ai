/**
 * Code Tabs Component
 * Displays a horizontal scrollable list of code tabs for code file management
 */

import { useState, useRef, useEffect } from 'react';
import './CodeTabs.css';

const CodeTabs = ({
  codeRecords,
  currentCodeId,
  onSwitchCode,
  onCreateCode,
  onRenameCode,
  onViewPortConfig,
  isPortConfigLoading,
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const tabsContainerRef = useRef(null);

  const handleStartEdit = (codeRecord) => {
    setEditingId(codeRecord.id);
    setEditingName(codeRecord.name || 'Untitled');
  };

  const handleSaveEdit = async (codeId) => {
    if (editingName.trim()) {
      await onRenameCode(codeId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleKeyDown = (e, codeId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit(codeId);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const scrollLeft = () => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const checkOverflow = () => {
    if (tabsContainerRef.current) {
      const { scrollWidth, clientWidth } = tabsContainerRef.current;
      setShowScrollButtons(scrollWidth > clientWidth);
    }
  };

  useEffect(() => {
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [codeRecords]);

  return (
    <div className="code-tabs-wrapper">
      {showScrollButtons && (
        <button className="code-tabs-scroll-btn left" onClick={scrollLeft} aria-label="Scroll left">
          ←
        </button>
      )}
      
      <div className="code-tabs-container" ref={tabsContainerRef}>
        {codeRecords.map((codeRecord) => {
          const isActive = codeRecord.id === currentCodeId;
          const isEditing = editingId === codeRecord.id;

          return (
            <div
              key={codeRecord.id}
              className={`code-tab ${isActive ? 'active' : ''}`}
              onClick={() => !isEditing && onSwitchCode(codeRecord.id)}
            >
              {isEditing ? (
                <input
                  type="text"
                  className="code-tab-input"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleSaveEdit(codeRecord.id)}
                  onKeyDown={(e) => handleKeyDown(e, codeRecord.id)}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span className="code-tab-name" onDoubleClick={() => handleStartEdit(codeRecord)}>
                    {codeRecord.name || 'Code Tab'}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
      
      {showScrollButtons && (
        <button className="code-tabs-scroll-btn right" onClick={scrollRight} aria-label="Scroll right">
          →
        </button>
      )}

      <button className="code-tab-add" onClick={onCreateCode} aria-label="Add new code">
        + New Code
      </button>

      {onViewPortConfig && (
        <button 
          className="code-tab-port-config"
          onClick={onViewPortConfig} 
          disabled={isPortConfigLoading}
          aria-label="View port configuration"
        >
          {isPortConfigLoading ? (
            <div className="code-tab-port-config-loading">
              <span className="spinner-small"></span>
              <span>Analyzing...</span>
            </div>
          ) : (
            'View Port Configuration'
          )}
        </button>
      )}
    </div>
  );
};

export default CodeTabs;

