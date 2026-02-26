/**
 * Port Configuration Modal Component
 * Displays SPIKE PRIME hub with component ports visualized
 */

import { useEffect, useRef } from 'react';
import './ModalBase.css';
import './PortConfigModal.css';

// Import component images
import hubImage from '../assets/spike/hub.svg';
import motorImage from '../assets/spike/motor.svg';
import colorSensorImage from '../assets/spike/color_sensor.svg';
import distanceSensorImage from '../assets/spike/distance_sensor.svg';
import forceSensorImage from '../assets/spike/force_sensor.svg';
import noneImage from '../assets/spike/none.svg';

const componentImages = {
  motor: motorImage,
  color_sensor: colorSensorImage,
  distance_sensor: distanceSensorImage,
  force_sensor: forceSensorImage,
  none: noneImage,
};

const PortConfigModal = ({ isOpen, portConfig, onClose }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  // Port positions around the hub (arranged in a circle-ish layout)
  const portPositions = {
    a: { top: '10%', left: '15%' },   // Top-left
    b: { top: '10%', right: '15%' },  // Top-right
    c: { top: '40%', left: '5%' },    // Middle-left
    d: { top: '40%', right: '5%' },   // Middle-right
    e: { bottom: '10%', left: '15%' }, // Bottom-left
    f: { bottom: '10%', right: '15%' }, // Bottom-right
  };

  return (
    <div className="modal-overlay" ref={modalRef} onClick={handleBackdropClick}>
      <div className="modal-content modal-content-wide port-config-box">
        <div className="port-config-header">
          <h2>SPIKE Prime Port Configuration</h2>
          <button className="port-config-close" onClick={onClose}>×</button>
        </div>

        <div className="port-config-content">
          <div className="hub-container">
            <img src={hubImage} alt="SPIKE Prime Hub" className="hub-image" />
          </div>

          {Object.entries(portPositions).map(([port, position]) => {
            const component = portConfig?.[port] || 'none';
            const componentImage = componentImages[component] || noneImage;
            
            return (
              <div
                key={port}
                className="port-slot"
                style={position}
              >
                <div className="port-label">Port {port.toUpperCase()}</div>
                <img
                  src={componentImage}
                  alt={component.replace('_', ' ')}
                  className="component-image"
                />
                <div className="component-label">
                  {component === 'none' ? 'Empty' : component.replace('_', ' ')}
                </div>
              </div>
            );
          })}
        </div>

        <div className="port-config-actions">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default PortConfigModal;

