import { fireEvent, render } from '@testing-library/react-native';

import { Button, Select, TextField } from '@/components/ui';
import { AppScreen } from '@/components/layout/app-screen';
import { Text } from 'react-native';
import { colors } from '@/theme';
import { messages } from '@/i18n/messages';

describe('common components', () => {
  it('exposes loading and disabled state', async () => {
    const view = await render(
      <Button label="Save" loading onPress={jest.fn()} />,
    );
    expect(view.getByRole('button')).toBeDisabled();
  });

  it('associates field errors with accessible input feedback', async () => {
    const view = await render(
      <TextField label="Email" error="Invalid email" />,
    );
    expect(view.getByRole('alert')).toHaveTextContent('Invalid email');
    expect(view.getByLabelText('Email')).toBeTruthy();
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
