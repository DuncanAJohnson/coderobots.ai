import { createContext, useContext, useState } from 'react';
import en from '../locales/en.json';
import da from '../locales/da.json';

const translations = { en, da };
const LANG_KEY = 'coderobots_language';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem(LANG_KEY) || 'da';
  });

  const t = (key) => translations[lang]?.[key] ?? translations['en']?.[key] ?? key;

  const switchLang = (newLang) => {
    setLang(newLang);
    localStorage.setItem(LANG_KEY, newLang);
  };

  return (
    <LanguageContext.Provider value={{ lang, switchLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
