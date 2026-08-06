import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from 'react-native';

import { useI18n } from '@/i18n/i18n-provider';
import { useOptionalTheme } from '@/providers/theme-provider';
import { colors, controlHeight, radius, spacing, typography } from '@/theme';

const googleLogoSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18">
    <path fill="${colors.social.googleBlue}" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.716v2.258h2.909c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
    <path fill="${colors.social.googleGreen}" d="M9 18c2.43 0 4.468-.806 5.956-2.18l-2.909-2.258c-.806.54-1.836.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z"/>
    <path fill="${colors.social.googleYellow}" d="M3.963 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.281-1.707V4.961H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.039l3.007-2.332Z"/>
    <path fill="${colors.social.googleRed}" d="M9 3.58c1.321 0 2.507.454 3.441 1.346l2.581-2.58C13.464.891 11.426 0 9 0A9 9 0 0 0 .956 4.961l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z"/>
  </svg>
`;

const googleLogoUri = `data:image/svg+xml;utf8,${encodeURIComponent(googleLogoSvg)}`;

type Props = Omit<PressableProps, 'children'> & {
  loading?: boolean;
};

export function GoogleSignInButton({
  disabled,
  loading = false,
  style,
  ...props
}: Props) {
  const { t } = useI18n();
  const theme = useOptionalTheme();
  const isDark = theme?.resolved === 'dark';
  const palette = isDark ? colors.dark : colors.light;
  const unavailable = disabled || loading;

  return (
    <Pressable
      accessibilityLabel={t('auth.continueWithGoogle')}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: unavailable }}
      cssInterop={false}
      disabled={unavailable}
      style={(state) => [
        styles.button,
        {
          borderColor: isDark ? colors.onBrand : colors.social.googleBorder,
          backgroundColor: palette.surface,
        },
        state.pressed && styles.pressed,
        state.pressed && { backgroundColor: palette.background },
        unavailable && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      testID="google-sign-in-button"
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={isDark ? colors.onBrand : colors.social.googleText}
        />
      ) : (
        <>
          <Image
            accessibilityElementsHidden
            source={{ uri: googleLogoUri }}
            style={styles.logo}
            contentFit="contain"
          />
          <Text
            style={[
              styles.label,
              { color: isDark ? palette.text : colors.social.googleText },
            ]}
          >
            {t('auth.continueWithGoogle')}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    minHeight: controlHeight,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  pressed: { opacity: 0.86 },
  disabled: { opacity: 0.45 },
  logo: { width: 20, height: 20 },
  label: {
    fontFamily: typography.semibold,
    fontSize: 16,
  },
});
