import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';

import { colors, typography } from '@/theme';

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
  const paperTheme = useMemo(() => {
    const base = value.resolved === 'dark' ? MD3DarkTheme : MD3LightTheme;
    const palette = value.resolved === 'dark' ? colors.dark : colors.light;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.brand,
        secondary: colors.purple,
        background: palette.background,
        surface: palette.surface,
        surfaceVariant: palette.surfaceVariant,
        onSurface: palette.text,
        onSurfaceVariant: palette.muted,
        outline: palette.border,
        error: palette.error,
        errorContainer: palette.errorContainer,
        onError: palette.onError,
        onErrorContainer: palette.onErrorContainer,
      },
      fonts: {
        ...base.fonts,
        bodyMedium: {
          ...base.fonts.bodyMedium,
          fontFamily: typography.regular,
        },
        labelLarge: {
          ...base.fonts.labelLarge,
          fontFamily: typography.semibold,
        },
        titleLarge: { ...base.fonts.titleLarge, fontFamily: typography.bold },
      },
    };
  }, [value.resolved]);
  return (
    <ThemeContext.Provider value={value}>
      <PaperProvider theme={paperTheme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used within ThemeProvider');
  return value;
}

export function useOptionalTheme() {
  return useContext(ThemeContext);
}
