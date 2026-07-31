jest.mock('react-native-gesture-handler', () => {
  const chain: Record<string, jest.Mock> = {};
  for (const method of [
    'enabled',
    'activeOffsetX',
    'failOffsetY',
    'runOnJS',
    'onUpdate',
    'onEnd',
  ]) {
    chain[method] = jest.fn(() => chain);
  }
  return {
    Gesture: { Pan: jest.fn(() => chain) },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => false,
    useSharedValue: (initial: number) => ({
      value: initial,
      get() {
        return this.value;
      },
      set(value: number) {
        this.value = value;
      },
    }),
    withSpring: (value: number) => value,
    withTiming: (value: number) => value,
  };
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';

import { DiscoveryCard } from '@/features/discovery/discovery-card';

describe('DiscoveryCard accessible actions', () => {
  it('offers button equivalents and locks both actions while pending', async () => {
    const onAction = jest.fn();
    const onOpenProfile = jest.fn();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const view = await render(
      <QueryClientProvider client={queryClient}>
        <DiscoveryCard
          candidate={{
            userRoleId: 'role-1',
            displayName: 'An',
            avatarAssetId: null,
            headline: 'Ảnh cưới',
            availabilityStatus: 'AVAILABLE',
            verified: true,
            distance: '3-5 km',
          }}
          scope={{ userId: 'user-1', roleId: 'customer-role' }}
          pending={false}
          onAction={onAction}
          onOpenProfile={onOpenProfile}
        />
      </QueryClientProvider>,
    );
    expect(view.getByText('Ảnh cưới')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Bỏ qua An' }));
    await fireEvent.press(view.getByRole('button', { name: 'Xem hồ sơ An' }));
    await fireEvent.press(view.getByRole('button', { name: 'Quan tâm An' }));
    expect(onAction).toHaveBeenNthCalledWith(1, 'LEFT');
    expect(onAction).toHaveBeenNthCalledWith(2, 'RIGHT');
    expect(onOpenProfile).toHaveBeenCalledTimes(1);

    await view.rerender(
      <QueryClientProvider client={queryClient}>
        <DiscoveryCard
          candidate={{
            userRoleId: 'role-1',
            displayName: 'An',
            avatarAssetId: null,
            headline: null,
            availabilityStatus: null,
            verified: false,
            distance: '3-5 km',
          }}
          scope={{ userId: 'user-1', roleId: 'customer-role' }}
          pending
          onAction={onAction}
          onOpenProfile={jest.fn()}
        />
      </QueryClientProvider>,
    );
    expect(view.getByRole('button', { name: 'Bỏ qua An' })).toBeDisabled();
    expect(view.getByRole('button', { name: 'Quan tâm An' })).toBeDisabled();
    view.unmount();
    queryClient.clear();
  });
});
