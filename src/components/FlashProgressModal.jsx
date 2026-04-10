import { useLanguage } from '../contexts/LanguageContext';
import './ModalBase.css';
import './FlashProgressModal.css';

const titleKeyForPhase = (phase) => {
  switch (phase) {
    case 'probing':      return 'flashTitleProbing';
    case 'flashing':     return 'flashTitleFlashing';
    case 'reconnecting': return 'flashTitleReconnecting';
    default:             return 'flashTitleConnecting';
  }
};

const FlashProgressModal = ({ open, phase, progress, message }) => {
  const { t } = useLanguage();
  if (!open) return null;

  const hasProgress = typeof progress === 'number';
  const pct = hasProgress ? Math.max(0, Math.min(100, Math.round(progress))) : 0;

  return (
    <div className="modal-overlay flash-progress-overlay">
      <div className="modal-content flash-progress-modal">
        <h2 className="flash-progress-title">{t(titleKeyForPhase(phase))}</h2>
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
        <p className="flash-progress-hint">{t('flashHint')}</p>
      </div>
    </div>
  );
};

export default FlashProgressModal;
