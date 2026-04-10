import { useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useHardware } from '../contexts/HardwareContext';
import './ModalBase.css';
import './HardwarePickerModal.css';

const HardwarePickerModal = ({ visible, onClose, dismissable = true }) => {
  const { t } = useLanguage();
  const { hardware, switchHardware } = useHardware();

  useEffect(() => {
    if (!visible || !dismissable) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, dismissable, onClose]);

  if (!visible) return null;

  const handlePick = async (choice) => {
    await switchHardware(choice);
    onClose?.();
  };

  const handleBackdropClick = () => {
    if (dismissable) onClose?.();
  };

  const options = [
    { id: 'microbit', label: t('microbit') },
    { id: 'spike', label: t('spikePrime') },
    { id: 'lego-education', label: t('legoEducation') },
  ];

  return (
    <div className="modal-overlay hw-picker-overlay" onClick={handleBackdropClick}>
      <div className="modal-content hw-picker-content" onClick={(e) => e.stopPropagation()}>
        <h1 className="hw-picker-title">{t('hardwarePickerTitle')}</h1>
        <p className="hw-picker-subtitle">{t('hardwarePickerSubtitle')}</p>

        <div className="hw-picker-tiles">
          {options.map((opt) => (
            <button
              key={opt.id}
              className={`hw-picker-tile${hardware === opt.id ? ' hw-picker-tile--active' : ''}`}
              onClick={() => handlePick(opt.id)}
            >
              <span className="hw-picker-tile-label">{opt.label}</span>
            </button>
          ))}
        </div>

        {dismissable && (
          <button className="hw-picker-close-button" onClick={onClose}>
            {t('close')}
          </button>
        )}
      </div>
    </div>
  );
};

export default HardwarePickerModal;
