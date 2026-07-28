import { useRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

const OTP_LENGTH = 6;

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
};

export function OtpInput({
  value,
  onChange,
  disabled = false,
  hasError = false,
}: Props) {
  const refs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const digits = Array.from(
    { length: OTP_LENGTH },
    (_, index) => value[index] ?? '',
  );

  const changeDigit = (index: number, input: string) => {
    const numeric = input.replace(/\D/g, '');
    if (!numeric) {
      if (!digits[index]) return;
      const next = value.split('');
      next.splice(index, 1);
      onChange(next.join(''));
      return;
    }

    if (numeric.length > 1) {
      const next = `${value.slice(0, index)}${numeric}${value.slice(
        index + numeric.length,
      )}`.slice(0, OTP_LENGTH);
      onChange(next);
      focusAfterInput(index, numeric.length, next.length);
      return;
    }

    const next = value.split('');
    if (index >= next.length) next.push(numeric);
    else next[index] = numeric;
    const resolved = next.join('').slice(0, OTP_LENGTH);
    onChange(resolved);
    focusAfterInput(index, 1, resolved.length);
  };

  const focusAfterInput = (
    index: number,
    insertedLength: number,
    nextLength: number,
  ) => {
    const nextIndex = Math.min(index + insertedLength, OTP_LENGTH - 1);
    if (nextLength >= OTP_LENGTH) refs.current[OTP_LENGTH - 1]?.blur();
    else refs.current[nextIndex]?.focus();
  };

  const handleKeyPress = (
    index: number,
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) => {
    if (event.nativeEvent.key !== 'Backspace' || digits[index] || index === 0) {
      return;
    }
    const previousIndex = index - 1;
    const next = value.split('');
    next.splice(previousIndex, 1);
    onChange(next.join(''));
    refs.current[previousIndex]?.focus();
  };

  return (
    <View
      accessibilityLabel="Mã OTP 6 số"
      style={styles.container}
      testID="otp-input"
    >
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(input) => {
            refs.current[index] = input;
          }}
          accessibilityLabel={`Chữ số OTP ${index + 1}`}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          textContentType={index === 0 ? 'oneTimeCode' : 'none'}
          value={digit}
          editable={!disabled}
          inputMode="numeric"
          keyboardType="number-pad"
          maxLength={index === 0 ? 16 : 1}
          selectTextOnFocus
          style={[
            styles.input,
            focusedIndex === index && styles.focused,
            hasError && styles.error,
          ]}
          onChangeText={(input) => changeDigit(index, input)}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() =>
            setFocusedIndex((current) => (current === index ? null : current))
          }
          onKeyPress={(event) => handleKeyPress(index, event)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    maxWidth: 52,
    minWidth: 40,
    height: 56,
    paddingHorizontal: 0,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.md,
    backgroundColor: colors.light.surface,
    color: colors.light.text,
    fontFamily: typography.semibold,
    fontSize: 24,
    textAlign: 'center',
  },
  focused: {
    borderColor: colors.brand,
    borderWidth: 2,
  },
  error: {
    borderColor: colors.danger,
  },
});
