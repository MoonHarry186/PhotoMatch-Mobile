import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { DiscoveryFilterSheet } from '@/features/discovery/discovery-filter-sheet';
import { defaultDiscoveryFilters } from '@/features/discovery/discovery.types';

describe('DiscoveryFilterSheet nearby integration', () => {
  it('keeps radius hidden until Gần tôi is explicitly enabled', async () => {
    const onApply = jest.fn(async () => undefined);
    const view = await render(
      <DiscoveryFilterSheet
        filters={defaultDiscoveryFilters}
        services={[]}
        onApply={onApply}
        onClose={jest.fn()}
      />,
    );

    expect(
      view.getByRole('header', { name: 'Tùy chọn khám phá' }),
    ).toBeTruthy();
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
    const view = await render(
      <DiscoveryFilterSheet
        filters={{
          ...defaultDiscoveryFilters,
          nearbyOnly: true,
          availableOnly: true,
          verifiedOnly: true,
          radiusKm: 50,
        }}
        services={[]}
        onApply={onApply}
        onClose={jest.fn()}
      />,
    );

    expect(view.getByText('Bán kính gần tôi')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Đặt lại bộ lọc' }));
    expect(view.queryByText('Bán kính gần tôi')).toBeNull();
    expect(onApply).not.toHaveBeenCalled();

    await fireEvent.press(view.getByRole('button', { name: 'Áp dụng' }));
    await waitFor(() =>
      expect(onApply).toHaveBeenCalledWith(defaultDiscoveryFilters),
    );
  });
});
