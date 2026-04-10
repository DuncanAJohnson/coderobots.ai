import { createContext, useContext, useRef, useState } from 'react';

const HW_KEY = 'coderobots_hardware';

const HardwareContext = createContext(null);

export const HardwareProvider = ({ children }) => {
  const [hardware, setHardware] = useState(() => localStorage.getItem(HW_KEY));
  const disconnectHandlerRef = useRef(null);

  const registerDisconnectHandler = (fn) => {
    disconnectHandlerRef.current = fn;
    return () => {
      if (disconnectHandlerRef.current === fn) {
        disconnectHandlerRef.current = null;
      }
    };
  };

  const switchHardware = async (newHw) => {
    if (newHw === hardware) return;
    if (disconnectHandlerRef.current) {
      try {
        await disconnectHandlerRef.current();
      } catch (err) {
        console.warn('Disconnect before hardware switch failed:', err);
      }
    }
    setHardware(newHw);
    localStorage.setItem(HW_KEY, newHw);
  };

  const hasChosenHardware = hardware !== null;
  const isMicrobit = hardware === 'microbit';
  const isLegoEducation = hardware === 'lego-education';

  return (
    <HardwareContext.Provider
      value={{
        hardware,
        hasChosenHardware,
        switchHardware,
        isMicrobit,
        isLegoEducation,
        registerDisconnectHandler,
      }}
    >
      {children}
    </HardwareContext.Provider>
  );
};

export const useHardware = () => useContext(HardwareContext);
