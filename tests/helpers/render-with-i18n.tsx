import AsyncStorage from '@react-native-async-storage/async-storage';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { I18nProvider } from '@/i18n/i18n-provider';

export async function renderWithI18n(ui: ReactElement) {
  await AsyncStorage.setItem('photomatch.locale.v1', 'vi');
  return await render(<I18nProvider initialLocale="vi">{ui}</I18nProvider>);
}
