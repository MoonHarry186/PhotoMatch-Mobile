import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';

type Preference = 'system' | 'light' | 'dark';
type ResolvedTheme = 'light' | 'dark';
type ThemeContextValue = {
  preference: Preference;
  resolved: ResolvedTheme;
  setPreference: (value: Preference) => Promise<void>;
};

const STORAGE_KEY = 'photomatch.appearance.v1';
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: React.PropsWithChildren) {
  const colorScheme = useColorScheme();
  const { setColorScheme } = useNativeWindColorScheme();
  const system: ResolvedTheme = colorScheme === 'dark' ? 'dark' : 'light';
  const [preference, setPreferenceState] = useState<Preference>('system');

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'system' || stored === 'light' || stored === 'dark') {
        setPreferenceState(stored);
      }
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolved: preference === 'system' ? system : preference,
      setPreference: async (next) => {
        setPreferenceState(next);
        await AsyncStorage.setItem(STORAGE_KEY, next);
      },
    }),
    [preference, system],
  );
  useEffect(() => {
    setColorScheme(value.resolved);
  }, [setColorScheme, value.resolved]);
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used within ThemeProvider');
  return value;
}
