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
});
