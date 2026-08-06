import { SymbolView } from 'expo-symbols';
import { forwardRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { InlineError } from '@/components/feedback/InlineError';
import { useOptionalI18n } from '@/i18n/i18n-provider';
import { messages } from '@/i18n/messages';
import { useOptionalTheme } from '@/providers/theme-provider';
import { colors, controlHeight, radius, spacing, typography } from '@/theme';

type Props = TextInputProps & {
  label: string;
  labelAccessory?: ReactNode;
  error?: string;
  secureToggle?: boolean;
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
};

export const TextField = forwardRef<TextInput, Props>(function TextField(
  {
    label,
    labelAccessory,
    error,
    secureToggle,
    secureTextEntry,
    showPasswordLabel,
    hidePasswordLabel,
    multiline,
    style,
    ...props
  },
  ref,
) {
  const [hidden, setHidden] = useState(secureTextEntry);
  const i18n = useOptionalI18n();
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  const resolvedShowPasswordLabel =
    showPasswordLabel ??
    i18n?.t('auth.showPassword') ??
    messages.vi['auth.showPassword'];
  const resolvedHidePasswordLabel =
    hidePasswordLabel ??
    i18n?.t('auth.hidePassword') ??
    messages.vi['auth.hidePassword'];
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
        {labelAccessory}
      </View>
      <View
        style={[
          styles.field,
          { backgroundColor: palette.surface, borderColor: palette.border },
          multiline && styles.multilineField,
          error && styles.errorField,
        ]}
      >
        <TextInput
          ref={ref}
          style={[
            styles.input,
            { color: palette.text },
            multiline && styles.multilineInput,
            style,
          ]}
          placeholderTextColor={palette.muted}
          accessibilityLabel={label}
          accessibilityHint={error}
          secureTextEntry={hidden}
          multiline={multiline}
          {...props}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              hidden ? resolvedShowPasswordLabel : resolvedHidePasswordLabel
            }
            onPress={() => setHidden((value) => !value)}
            style={styles.toggle}
          >
            <SymbolView
              name={
                hidden
                  ? { ios: 'eye', android: 'visibility', web: 'visibility' }
                  : {
                      ios: 'eye.slash',
                      android: 'visibility_off',
                      web: 'visibility_off',
                    }
              }
              size={22}
              tintColor={palette.text}
            />
          </Pressable>
        ) : null}
      </View>
      <InlineError message={error} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  label: {
    flexShrink: 1,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  field: {
    minHeight: controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
  },
  errorField: { borderColor: colors.danger },
  multilineField: {
    minHeight: 132,
    alignItems: 'stretch',
  },
  input: {
    flex: 1,
    minHeight: controlHeight,
    paddingHorizontal: spacing.md,
    fontFamily: typography.regular,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 132,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    textAlignVertical: 'top',
  },
  toggle: {
    minWidth: 52,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
