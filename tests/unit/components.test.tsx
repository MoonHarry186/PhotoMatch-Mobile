jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

import DateTimePicker from '@react-native-community/datetimepicker';
import { act, fireEvent, render } from '@testing-library/react-native';

import { Button, DateTimeField, Select, TextField } from '@/components/ui';
import { AppScreen } from '@/components/layout/app-screen';
import { StyleSheet, Text } from 'react-native';
import { colors } from '@/theme';
import { messages } from '@/i18n/messages';

const mockDateTimePicker = DateTimePicker as unknown as jest.Mock;

describe('common components', () => {
  it('exposes loading and disabled state', async () => {
    const view = await render(
      <Button label="Save" loading onPress={jest.fn()} />,
    );
    expect(view.getByRole('button')).toBeDisabled();
  });

  it('associates field errors with accessible input feedback', async () => {
    const view = await render(
      <TextField
        label="Email"
        labelAccessory={<Text>Help</Text>}
        error="Invalid email"
      />,
    );
    expect(view.getByRole('alert')).toHaveTextContent('Invalid email');
    expect(view.getByLabelText('Email')).toBeTruthy();
    expect(view.getByText('Help')).toBeTruthy();
  });

  it('gives multiline introductions a spacious top-aligned input', async () => {
    const view = await render(
      <TextField label="Giới thiệu" multiline numberOfLines={5} />,
    );
    const input = view.getByLabelText('Giới thiệu');
    const style = StyleSheet.flatten(input.props.style);

    expect(input.props.multiline).toBe(true);
    expect(style.minHeight).toBe(132);
    expect(style.textAlignVertical).toBe('top');
  });

  it('selects a birth date through the date picker', async () => {
    const onChange = jest.fn();
    const view = await render(
      <DateTimeField
        label="Ngày sinh"
        value={null}
        maximumDate={new Date(2008, 0, 1)}
        onChange={onChange}
      />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Ngày sinh' }));
    const pickerProps = mockDateTimePicker.mock.calls.at(-1)?.[0] as {
      onChange: (event: { type: string }, date: Date) => void;
    };
    await act(async () => {
      pickerProps.onChange({ type: 'set' }, new Date(1990, 4, 20));
    });
    expect(onChange).toHaveBeenCalledWith(new Date(1990, 4, 20));
  });

  it('toggles password visibility with an accessible icon button', async () => {
    const view = await render(
      <TextField label="Password" secureTextEntry secureToggle />,
    );
    const input = view.getByLabelText('Password');

    expect(input.props.secureTextEntry).toBe(true);
    await fireEvent.press(view.getByRole('button', { name: 'Hiện mật khẩu' }));
    expect(input.props.secureTextEntry).toBe(false);
    expect(view.getByRole('button', { name: 'Ẩn mật khẩu' })).toBeTruthy();
  });

  it('supports a non-gesture select action', async () => {
    const onChange = jest.fn();
    const view = await render(
      <Select
        label="Role"
        options={[{ value: 'customer', label: 'Customer' }]}
        onChange={onChange}
      />,
    );
    await fireEvent.press(view.getByText('Customer'));
    expect(onChange).toHaveBeenCalledWith('customer');
  });

  it('keeps keyboard avoidance and large text unconstrained', async () => {
    const view = await render(
      <AppScreen>
        <Text>Long localized content remains multiline</Text>
      </AppScreen>,
    );
    expect(view.getByTestId('app-screen-keyboard-avoiding')).toBeTruthy();
    expect(
      view.getByText('Long localized content remains multiline').props
        .numberOfLines,
    ).toBeUndefined();
  });

  it('keeps primary contrast above WCAG AA', () => {
    const luminance = (hex: string) => {
      const channels = hex
        .slice(1)
        .match(/.{2}/g)!
        .map((value) => Number.parseInt(value, 16) / 255)
        .map((value) =>
          value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
        );
      return (
        0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
      );
    };
    const ratio =
      (luminance('#FFFFFF') + 0.05) / (luminance(colors.brandPressed) + 0.05);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps VI and EN catalogs aligned for overflow-safe copy', () => {
    expect(Object.keys(messages.vi).sort()).toEqual(
      Object.keys(messages.en).sort(),
    );
  });
});
