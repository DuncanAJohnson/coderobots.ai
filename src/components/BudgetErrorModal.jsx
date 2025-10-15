/**
 * Budget Error Modal Component
 * Displays budget exceeded messages with countdown to reset
 */

import { useState, useEffect } from 'react';
import { getNextMondayET } from '../services/aiUsage';
import './BudgetErrorModal.css';

const BudgetErrorModal = ({ visible, onClose, accessLevel }) => {
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!visible) return;

    const updateCountdown = () => {
      const nextMonday = getNextMondayET();
      const now = new Date();
      const diff = nextMonday - now;

      if (diff <= 0) {
        setCountdown('Budget has reset!');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      let countdownStr = '';
      if (days > 0) countdownStr += `${days}d `;
      if (hours > 0 || days > 0) countdownStr += `${hours}h `;
      if (minutes > 0 || hours > 0 || days > 0) countdownStr += `${minutes}m `;
      countdownStr += `${seconds}s`;

      setCountdown(countdownStr);
    };

    // Update immediately and then every second
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  const isEN1 = accessLevel === 'en1';

  const handleOverlayClick = (e) => {
    // Only close if clicking the overlay itself (not the modal content)
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div
      className="budget-error-modal-overlay"
      style={{ display: visible ? 'flex' : 'none' }}
      onClick={handleOverlayClick}
    >
      <div className="budget-error-modal-box">
        <div className="budget-error-modal-header">
          <h2>⚠️ Budget Limit Reached</h2>
          <button className="budget-error-modal-close-btn" onClick={onClose}>×</button>
        </div>
        <div className="budget-error-modal-body">
          {isEN1 ? (
            <>
              <p className="budget-error-message">
                You've reached your weekly budget for premium models (gpt-5 and gpt-5-mini).
              </p>
              <p className="budget-error-suggestion">
                <strong>Please use gpt-5-nano</strong>, which has unlimited usage for upgraded users.
              </p>
            </>
          ) : (
            <>
              <p className="budget-error-message">
                You've reached your weekly AI usage budget.
              </p>
              <p className="budget-error-reset">
                Your budget will reset in: <strong>{countdown}</strong>
              </p>
              <p className="budget-error-info">
                Budget resets every Monday at midnight Eastern Time.
              </p>
            </>
          )}
        </div>
        <div className="budget-error-modal-footer">
          <button className="modal-btn primary" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetErrorModal;

