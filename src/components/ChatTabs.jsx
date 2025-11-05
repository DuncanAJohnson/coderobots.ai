/**
 * Chat Tabs Component
 * Displays a horizontal scrollable list of chat tabs for conversation management
 */

import { useState, useRef, useEffect } from 'react';
import './ChatTabs.css';

const ChatTabs = ({
  conversations,
  currentConversationId,
  onSwitchConversation,
  onCreateConversation,
  onRenameConversation,
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const tabsContainerRef = useRef(null);

  const handleStartEdit = (conversation) => {
    setEditingId(conversation.id);
    setEditingName(conversation.name || 'Unnamed Chat');
  };

  const handleSaveEdit = async (conversationId) => {
    if (editingName.trim()) {
      await onRenameConversation(conversationId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleKeyDown = (e, conversationId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit(conversationId);
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
  }, [conversations]);

  return (
    <div className="chat-tabs-wrapper">
      {showScrollButtons && (
        <button className="chat-tabs-scroll-btn left" onClick={scrollLeft} aria-label="Scroll left">
          ←
        </button>
      )}
      
      <div className="chat-tabs-container" ref={tabsContainerRef}>
        {conversations.map((conversation) => {
          const isActive = conversation.id === currentConversationId;
          const isEditing = editingId === conversation.id;

          return (
            <div
              key={conversation.id}
              className={`chat-tab ${isActive ? 'active' : ''}`}
              onClick={() => !isEditing && onSwitchConversation(conversation.id)}
            >
              {isEditing ? (
                <input
                  type="text"
                  className="chat-tab-input"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleSaveEdit(conversation.id)}
                  onKeyDown={(e) => handleKeyDown(e, conversation.id)}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span className="chat-tab-name" onDoubleClick={() => handleStartEdit(conversation)}>
                    {conversation.name || 'Unnamed Chat'}
                  </span>
                </>
              )}
            </div>
          );
        })}
        
        
      </div>
      
      {showScrollButtons && (
        <button className="chat-tabs-scroll-btn right" onClick={scrollRight} aria-label="Scroll right">
          →
        </button>
      )}

      <button className="chat-tab-add" onClick={onCreateConversation} aria-label="Add new chat">
        + New Chat
      </button>
    </div>
  );
};

export default ChatTabs;

