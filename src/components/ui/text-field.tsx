import { SymbolView } from 'expo-symbols';
import { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { InlineError } from '@/components/feedback/InlineError';
import { colors, controlHeight, radius, spacing, typography } from '@/theme';

type Props = TextInputProps & {
  label: string;
  error?: string;
  secureToggle?: boolean;
};

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, secureToggle, secureTextEntry, ...props },
  ref,
) {
  const [hidden, setHidden] = useState(secureTextEntry);
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, error && styles.errorField]}>
        <TextInput
          ref={ref}
          style={styles.input}
          placeholderTextColor={colors.light.muted}
          accessibilityLabel={label}
          accessibilityHint={error}
          secureTextEntry={hidden}
          {...props}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Hiện mật khẩu' : 'Ẩn mật khẩu'}
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
              tintColor={colors.light.text}
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
  label: {
    color: colors.light.text,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  field: {
    minHeight: controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.light.border,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  errorField: { borderColor: colors.danger },
  input: {
    flex: 1,
    minHeight: controlHeight,
    paddingHorizontal: spacing.md,
    color: colors.light.text,
    fontFamily: typography.regular,
    fontSize: 16,
  },
  toggle: {
    minWidth: 52,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
