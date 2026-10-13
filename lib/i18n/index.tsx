'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Locale, translations, Translations } from './translations';

type TranslationParams = Record<string, string | number>;

interface I18nContextValue {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  t: (key: string, params?: TranslationParams) => string;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  dir: 'ltr',
  t: (key) => key,
  setLocale: () => {},
  toggleLocale: () => {},
});

const STORAGE_KEY = 'fawjhub-locale';

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return value !== undefined ? String(value) : `{${key}}`;
  });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored === 'ar' || stored === 'en') {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newLocale);
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'en' ? 'ar' : 'en');
  }, [locale, setLocale]);

  const t = useCallback((key: string, params?: TranslationParams) => {
    const dict: Translations = translations[locale] || translations.en;
    const template = dict[key] ?? translations.en[key] ?? key;
    return interpolate(template, params);
  }, [locale]);

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.dir = dir;
    }
  }, [locale, dir]);

  return (
    <I18nContext.Provider value={{ locale, dir, t, setLocale, toggleLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
