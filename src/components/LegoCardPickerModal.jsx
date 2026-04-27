import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { LEGO_CARDS } from '../utils/legoEducation/legoCards.js';
import './LegoCardPickerModal.css';

function formatTemplate(template, params) {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : `{${key}}`
  );
}

const KIND_TO_LABEL_KEY = {
  singlemotor: 'legoSingleMotor',
  doublemotor: 'legoDoubleMotor',
  colorsensor: 'legoColorSensor',
  controller: 'legoController',
};

const LegoCardPickerModal = ({ visible, kind, kindLabel, onConnect, onClose }) => {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) {
      setBusy(false);
      setError('');
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const handleKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, busy, onClose]);

  if (!visible) return null;

  const doConnect = async (cardEmoji) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await onConnect?.(kind, cardEmoji);
      if (result?.ok) {
        onClose?.();
        return;
      }
      if (result?.errorKey) {
        const params = { ...(result.errorParams || {}) };
        if (kind && KIND_TO_LABEL_KEY[kind]) {
          params.expected = t(KIND_TO_LABEL_KEY[kind]);
        }
        setError(formatTemplate(t(result.errorKey), params));
      } else if (result?.error) {
        setError(result.error);
      }
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleBackdrop = () => { if (!busy) onClose?.(); };

  return createPortal(
    <div className="lego-card-picker-overlay" onClick={handleBackdrop}>
      <div className="lego-card-picker-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="lego-card-picker-title">{t('legoChooseCardTitle')}</h2>
        {kindLabel && <p className="lego-card-picker-subtitle">{kindLabel}</p>}
        <div className="lego-card-picker-grid">
          {LEGO_CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              className="lego-card-picker-card"
              onClick={() => doConnect(card.emoji)}
              disabled={busy}
            >
              <span className="lego-card-picker-emoji" aria-hidden="true">{card.emoji}</span>
              <span className="lego-card-picker-label">{t(card.labelKey)}</span>
            </button>
          ))}
          {busy && (
            <div className="lego-card-picker-busy-overlay" aria-live="polite">
              <div className="lego-card-picker-spinner" aria-hidden="true" />
              <div className="lego-card-picker-busy-label">{t('legoConnecting')}</div>
            </div>
          )}
        </div>
        {error && <div className="lego-card-picker-error" role="alert">{error}</div>}
        <div className="lego-card-picker-footer">
          <button
            type="button"
            className="lego-card-picker-skip"
            onClick={() => doConnect(null)}
            disabled={busy}
          >
            {t('legoSkipCard')}
          </button>
          <button
            type="button"
            className="lego-card-picker-close"
            onClick={onClose}
            disabled={busy}
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LegoCardPickerModal;
