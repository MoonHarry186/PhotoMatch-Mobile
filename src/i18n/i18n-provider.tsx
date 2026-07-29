import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { messages, type Locale, type MessageKey } from './messages';

const STORAGE_KEY = 'photomatch.locale.v1';

export type Translate = (
  key: MessageKey,
  values?: Record<string, string | number>,
) => string;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: Translate;
  plural: (count: number, one: string, many: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: React.PropsWithChildren) {
  const [locale, setLocaleState] = useState<Locale>('vi');

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'vi' || stored === 'en') {
        setLocaleState(stored);
        return;
      }
      setLocaleState(getLocales()[0]?.languageCode === 'en' ? 'en' : 'vi');
    });
  }, []);

  const setLocale = useCallback(async (next: Locale) => {
    setLocaleState(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, values) => {
        const template: string =
          messages[locale][key] ?? messages.vi[key] ?? `⟦${key}⟧`;
        return Object.entries(values ?? {}).reduce<string>(
          (copy, [name, replacement]) =>
            copy.replaceAll(`{${name}}`, String(replacement)),
          template,
        );
      },
      plural: (count, one, many) =>
        (count === 1 ? one : many).replace('{count}', String(count)),
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used within I18nProvider');
  return value;
}
