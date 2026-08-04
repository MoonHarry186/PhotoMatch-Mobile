import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { ComponentProps } from 'react';

import { DiscoveryFilterSheet } from '@/features/discovery/discovery-filter-sheet';
import { defaultDiscoveryFilters } from '@/features/discovery/discovery.types';
import { I18nProvider } from '@/i18n/i18n-provider';
import { renderWithI18n } from '../helpers/render-with-i18n';

describe('DiscoveryFilterSheet nearby integration', () => {
  const renderSheet = (props: ComponentProps<typeof DiscoveryFilterSheet>) =>
    renderWithI18n(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        }}
      >
        <DiscoveryFilterSheet {...props} />
      </SafeAreaProvider>,
    );

  it('keeps radius hidden until Gần tôi is explicitly enabled', async () => {
    const onApply = jest.fn(async () => undefined);
    const view = await renderSheet({
      filters: defaultDiscoveryFilters,
      services: [],
      onApply,
      onClose: jest.fn(),
    });

    expect(view.getByRole('header', { name: 'Bộ lọc' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Đặt lại bộ lọc' })).toBeTruthy();
    expect(view.queryByText('Bán kính gần tôi')).toBeNull();
    await fireEvent(view.getByLabelText('Gần tôi'), 'valueChange', true);
    expect(view.getByText('Bán kính gần tôi')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Áp dụng' }));
    await waitFor(() =>
      expect(onApply).toHaveBeenCalledWith({
        ...defaultDiscoveryFilters,
        nearbyOnly: true,
      }),
    );
  });

  it('resets the draft before applying without mutating server state early', async () => {
    const onApply = jest.fn(async () => undefined);
    const view = await renderSheet({
      filters: {
        ...defaultDiscoveryFilters,
        nearbyOnly: true,
        availableOnly: true,
        verifiedOnly: true,
        radiusKm: 50,
      },
      services: [],
      onApply,
      onClose: jest.fn(),
    });

    expect(view.getByText('Bán kính gần tôi')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Đặt lại bộ lọc' }));
    expect(view.queryByText('Bán kính gần tôi')).toBeNull();
    expect(onApply).not.toHaveBeenCalled();

    await fireEvent.press(view.getByRole('button', { name: 'Áp dụng' }));
    await waitFor(() =>
      expect(onApply).toHaveBeenCalledWith(defaultDiscoveryFilters),
    );
  });

  it('renders the filter UI in English when English is selected', async () => {
    await AsyncStorage.setItem('photomatch.locale.v1', 'en');
    const view = await render(
      <I18nProvider>
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 0, right: 0, bottom: 0, left: 0 },
          }}
        >
          <DiscoveryFilterSheet
            filters={defaultDiscoveryFilters}
            services={[]}
            onApply={jest.fn()}
            onClose={jest.fn()}
          />
        </SafeAreaProvider>
      </I18nProvider>,
    );

    await waitFor(() =>
      expect(view.getByRole('header', { name: 'Filters' })).toBeTruthy(),
    );
    expect(view.getByText('Services')).toBeTruthy();
    expect(view.getByText('Budget')).toBeTruthy();
    expect(view.getByText('Near me')).toBeTruthy();
  });
});
