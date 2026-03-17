import { createContext, useContext, useState } from 'react';

const HW_KEY = 'coderobots_hardware';

const HardwareContext = createContext(null);

export const HardwareProvider = ({ children }) => {
  const [hardware, setHardware] = useState(() => {
    return localStorage.getItem(HW_KEY) || 'spike';
  });

  const switchHardware = (newHw) => {
    setHardware(newHw);
    localStorage.setItem(HW_KEY, newHw);
  };

  const isMicrobit = hardware === 'microbit';

  return (
    <HardwareContext.Provider value={{ hardware, switchHardware, isMicrobit }}>
      {children}
    </HardwareContext.Provider>
  );
};

export const useHardware = () => useContext(HardwareContext);
