import { useNavigationStore } from '@/stores/navigation.store';

const destination = {
  version: 1 as const,
  name: 'booking' as const,
  id: '11111111-1111-4111-8111-111111111111',
};

describe('pending deep-link queue', () => {
  beforeEach(() => useNavigationStore.getState().clear());

  it('keeps a cold-start target through first authentication', () => {
    useNavigationStore
      .getState()
      .queue('development:pending-auth', destination);
    expect(useNavigationStore.getState().consume('development:user-1')).toEqual(
      destination,
    );
    expect(useNavigationStore.getState().pending).toBeNull();
  });

  it('clears a private target after account switch', () => {
    useNavigationStore.getState().queue('development:user-1', destination);
    expect(
      useNavigationStore.getState().consume('development:user-2'),
    ).toBeNull();
  });

  it('shows the provider setup banner once and consumes it on first display', () => {
    useNavigationStore.getState().showProviderSetupBanner();
    expect(useNavigationStore.getState().providerSetupBannerVisible).toBe(true);

    expect(useNavigationStore.getState().consumeProviderSetupBanner()).toBe(
      true,
    );
    expect(useNavigationStore.getState().providerSetupBannerVisible).toBe(
      false,
    );
    expect(useNavigationStore.getState().consumeProviderSetupBanner()).toBe(
      false,
    );
  });
});
