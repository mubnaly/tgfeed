export type Locale = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

export interface I18nContextValue {
  locale: Locale;
  direction: Direction;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}
