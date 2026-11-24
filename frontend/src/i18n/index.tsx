import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DirectionProvider } from '@radix-ui/react-direction';

import { ar } from './ar';
import { en } from './en';
import type { Direction, I18nContextValue, Locale } from './types';

export * from './types';

const STORAGE_KEY = 'condenser-lang';

const translations: Record<Locale, Record<string, string>> = { en, ar };

const I18nContext = createContext<I18nContextValue | null>(null);

function detectDefaultLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'ar') return stored;
  return 'ar'; // Default language is Arabic (نافِع)
}

function applyHtmlAttributes(locale: Locale, dir: Direction) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    if (dir === 'rtl') {
      document.documentElement.classList.add('rtl');
    } else {
      document.documentElement.classList.remove('rtl');
    }
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectDefaultLocale);
  const direction: Direction = locale === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    applyHtmlAttributes(locale, direction);
  }, [locale, direction]);

  const setLocale = useCallback((nextLocale: Locale) => {
    localStorage.setItem(STORAGE_KEY, nextLocale);
    setLocaleState(nextLocale);
    applyHtmlAttributes(nextLocale, nextLocale === 'ar' ? 'rtl' : 'ltr');
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      let str = translations[locale]?.[key] ?? translations.en[key] ?? key;
      if (vars) {
        for (const [varKey, val] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{${varKey}\\}`, 'g'), String(val));
        }
      }
      return str;
    },
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      direction,
      setLocale,
      t,
    }),
    [locale, direction, setLocale, t],
  );

  return (
    <I18nContext.Provider value={value}>
      <DirectionProvider dir={direction}>{children}</DirectionProvider>
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback if accessed outside provider (e.g. isolated test)
    const fallbackDirection: Direction = 'ltr';
    return {
      locale: 'en',
      direction: fallbackDirection,
      setLocale: () => {},
      t: (key: string, vars?: Record<string, string | number>) => {
        let str = en[key as keyof typeof en] ?? key;
        if (vars) {
          for (const [varKey, val] of Object.entries(vars)) {
            str = str.replace(new RegExp(`\\{${varKey}\\}`, 'g'), String(val));
          }
        }
        return str;
      },
    };
  }
  return ctx;
}
