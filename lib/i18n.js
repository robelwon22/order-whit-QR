'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../locales/en.json';
import am from '../locales/am.json';
import { safeReadStorage, safeWriteStorage } from './storage';

const dictionaries = { en, am };

const I18nContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
  isAmharic: false,
});

export function I18nProvider({ children, initialLang }) {
  const [lang, setLangState] = useState(initialLang || 'en');

  useEffect(() => {
    const saved = safeReadStorage('app_lang', 'en');
    if (saved === 'en' || saved === 'am') {
      setLangState(saved);
    }
  }, []);

  const setLang = (newLang) => {
    if (newLang === 'en' || newLang === 'am') {
      setLangState(newLang);
      safeWriteStorage('app_lang', newLang);
    }
  };

  const t = (path, vars = {}) => {
    return translate(path, lang, vars);
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, isAmharic: lang === 'am' }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function translate(path, lang = 'en', vars = {}) {
  const dict = dictionaries[lang] || dictionaries.en;
  const parts = path.split('.');
  let current = dict;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      // Fallback to English dictionary
      let fallback = dictionaries.en;
      for (const fPart of parts) {
        if (fallback && typeof fallback === 'object' && fPart in fallback) {
          fallback = fallback[fPart];
        } else {
          return path;
        }
      }
      current = fallback;
      break;
    }
  }

  if (typeof current !== 'string') return path;

  // Interpolate {{variable}}
  return current.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    return vars[key] !== undefined ? vars[key] : `{{${key}}}`;
  });
}
