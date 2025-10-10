/**
 * Session Selection Modal Component
 * Displays past sessions and allows creating new sessions
 */

import './SessionModal.css';

const SessionModal = ({ visible, sessions, onSelect, cancellable = false, onCancel }) => {
  if (!visible) return null;

  const handleOverlayClick = (e) => {
    // Only close if clicking the overlay itself (not the modal content)
    if (cancellable && e.target === e.currentTarget) {
      onCancel?.();
    }
  };

  const handleSessionSelect = (sessionId) => {
    onSelect?.(sessionId);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div 
      className="session-modal-overlay" 
      style={{ display: visible ? 'flex' : 'none' }}
      onClick={handleOverlayClick}
    >
      <div className="session-modal-box">
        <h2 className="session-modal-title">Select a Session</h2>
        
        <div className="session-modal-list">
          {sessions && sessions.length > 0 ? (
            sessions.map((session) => (
              <button
                key={session.id}
                className="session-modal-button"
                onClick={() => handleSessionSelect(session.id)}
              >
                Session from {formatDate(session.start_time)}
              </button>
            ))
          ) : (
            <p style={{ color: '#999', textAlign: 'center' }}>No past sessions found</p>
          )}
        </div>

        <button
          className="session-modal-button session-modal-new-button"
          onClick={() => handleSessionSelect('new')}
        >
          Start New Session
        </button>
      </div>
    </div>
  );
};

export default SessionModal;

