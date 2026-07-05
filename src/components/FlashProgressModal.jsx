import { useLanguage } from '../contexts/LanguageContext';
import './FlashProgressModal.css';
import './ModalBase.css';

const FlashProgressModal = ({ open, phase, progress, message }) => {
  const { t } = useLanguage();
  if (!open) return null;

  const hasProgress = typeof progress === 'number';
  const pct = hasProgress ? Math.max(0, Math.min(100, Math.round(progress))) : 0;

  const title =
    phase === 'probing'
      ? t('flashTitleProbing')
      : phase === 'flashing'
      ? t('flashTitleFlashing')
      : phase === 'reconnecting'
      ? t('flashTitleReconnecting')
      : t('flashTitleConnecting');

  return (
    <div className="modal-overlay flash-progress-overlay">
      <div className="modal-content flash-progress-modal">
        <h2 className="flash-progress-title">{title}</h2>
        <p className="flash-progress-message">{message}</p>
        <div className="flash-progress-bar">
          <div
            className={`flash-progress-bar-fill ${hasProgress ? '' : 'indeterminate'}`}
            style={hasProgress ? { width: `${pct}%` } : undefined}
          />
        </div>
        <div className="flash-progress-percent">
          {hasProgress ? `${pct}%` : t('flashWorking')}
        </div>
        <p className="flash-progress-hint">
          {t('flashHint')}
        </p>
      </div>
    </div>
  );
};

export default FlashProgressModal;
