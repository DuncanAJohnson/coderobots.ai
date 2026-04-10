import { useEffect, useState } from 'react';
import {
  connectDevice,
  disconnectDevice,
  getConnectionState,
  subscribe,
  LEGO_SLOT_NAMES,
} from '../utils/legoDevices';
import { useLanguage } from '../contexts/LanguageContext';
import './LegoConnectPanel.css';

const LegoConnectPanel = ({ onAnyConnectionChange }) => {
  const { t } = useLanguage();
  const [state, setState] = useState(getConnectionState());
  const [busy, setBusy] = useState({});

  useEffect(() => {
    const unsub = subscribe((next) => {
      setState(next);
      if (onAnyConnectionChange) {
        onAnyConnectionChange(Object.values(next).some(Boolean));
      }
    });
    return unsub;
  }, [onAnyConnectionChange]);

  const handleClick = async (kind) => {
    if (busy[kind]) return;
    setBusy((b) => ({ ...b, [kind]: true }));
    try {
      if (state[kind]) {
        await disconnectDevice(kind);
      } else {
        const result = await connectDevice(kind);
        if (!result.ok && result.error) {
          console.warn(`[LegoConnectPanel] ${kind}:`, result.error);
        }
      }
    } finally {
      setBusy((b) => ({ ...b, [kind]: false }));
    }
  };

  const labelKey = {
    singlemotor: 'legoSingleMotor',
    doublemotor: 'legoDoubleMotor',
    colorsensor: 'legoColorSensor',
    controller: 'legoController',
  };

  return (
    <div className="lego-connect-panel">
      <div className="lego-connect-title">{t('legoConnectTitle')}</div>
      <div className="lego-connect-tiles">
        {LEGO_SLOT_NAMES.map((kind) => {
          const connected = !!state[kind];
          const isBusy = !!busy[kind];
          return (
            <button
              key={kind}
              className={`lego-tile${connected ? ' lego-tile--connected' : ''}`}
              onClick={() => handleClick(kind)}
              disabled={isBusy}
            >
              <span className={`lego-dot${connected ? ' lego-dot--on' : ''}`} />
              <span className="lego-tile-label">{t(labelKey[kind])}</span>
              <span className="lego-tile-action">
                {isBusy ? '…' : connected ? t('disconnect') : t('connect')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LegoConnectPanel;
