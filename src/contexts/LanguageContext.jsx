/**
 * Language Context
 * Hand-rolled i18n: flat key → string dictionaries per locale, English
 * fallback, persisted choice. The instance config decides which locales are
 * offered and which is the default; a stored choice outside the instance's
 * available set is clamped to the default (the localStorage key is shared
 * across instances on the same origin).
 */

import { createContext, useContext, useState } from 'react';
import en from '../locales/en.json';
import da from '../locales/da.json';
import instance from '../config/instance';

const translations = { en, da };
const LANG_KEY = 'coderobots_language';

const LanguageContext = createContext(null);

function initialLang() {
  const { available, default: fallback } = instance.locales;
  const stored = localStorage.getItem(LANG_KEY);
  return stored && available.includes(stored) ? stored : fallback;
}

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(initialLang);

  const t = (key) => translations[lang]?.[key] ?? translations['en']?.[key] ?? key;

  const switchLang = (newLang) => {
    if (!instance.locales.available.includes(newLang)) return;
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
