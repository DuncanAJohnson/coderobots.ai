/**
 * AboutModal Component
 * Displays application information, version, and contact details
 */

import { useLanguage } from '../contexts/LanguageContext';
import './AboutModal.css';

const AboutModal = ({ visible, onClose }) => {
  const { t } = useLanguage();
  if (!visible) return null;

  return (
    <div className="about-modal-overlay" onClick={onClose}>
      <div className="about-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="about-header">
          <h1 className="about-title">{t('aboutModalTitle')}</h1>
          <p className="about-subtitle">{t('aboutSubtitle')}</p>
        </div>

        <div className="about-info-section">
          <div className="about-info-row">
            <span className="about-info-label">{t('version')}</span>
            <span className="about-info-value">March 9, 2026</span>
          </div>

          <div className="about-info-row">
            <span className="about-info-label">{t('createdBy')}</span>
            <span className="about-info-value">
              Dr. Ethan Danahy, Duncan Johnson, and Bill Church
            </span>
          </div>
        </div>

        <div className="about-footer">
          <p className="about-contact">
            {t('bugReportPrefix')}{' '}
            <a
              href="mailto:duncan.johnson@tufts.edu"
              className="about-link"
            >
              duncan.johnson@tufts.edu
            </a>
            .
          </p>
        </div>

        <button className="about-close-button" onClick={onClose}>
          {t('close')}
        </button>
      </div>
    </div>
  );
};

export default AboutModal;

