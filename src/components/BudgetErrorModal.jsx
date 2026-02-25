/**
 * Budget Error Modal Component
 * Displays budget exceeded messages
 */

import { useState, useEffect } from 'react';
import './BudgetErrorModal.css';

const BudgetErrorModal = ({ visible, onClose, accessLevel, premiumModels = [], nonPremiumModels = [] }) => {

  useEffect(() => {
    if (!visible) return;

  }, [visible]);

  if (!visible) return null;

  const isCamps = accessLevel === 'en1';

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
          <h2>Daily LLM Usage Limit Reached</h2>
        </div>
        <div className="budget-error-modal-body">
          {isCamps ? (
            <>
              <p className="budget-error-message">
                Every message sent to a Large Language Model (LLM) uses power and water. To ensure everyone is using these resources respectfully, there is a daily usage limit for premium models.
              </p>
              <div className="budget-error-suggestion-block">
                <p className="budget-error-suggestion">
                  <strong>{nonPremiumModels.length > 1 ? 'Please use one of these non-premium models:' : 'Please use the non-premium model:'}</strong>
                </p>
                <ul className="budget-error-model-list">
                  {nonPremiumModels.map((model) => (
                    <li key={model}>{model}</li>
                  ))}
                </ul>
              </div>
              <p className="budget-error-info">
                You can use premium models again at midnight Eastern Time.
              </p>
            </>
          ) : (
            <>
              <p className="budget-error-message">
              Every message sent to a Large Language Model (LLM) uses power and water. To ensure everyone is using these resources respectfully, there is a daily usage limit.
              </p>
              <p className="budget-error-info">
                You can use LLMs again at midnight Eastern Time.
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

