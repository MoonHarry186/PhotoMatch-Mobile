import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { env } from '@/config/env';
import type { DeepLinkDestination } from '@/schemas/runtime-contracts';
import { useNavigationStore } from '@/stores/navigation.store';

import { useSession } from './session-provider';

function hrefFor(destination: DeepLinkDestination) {
  return {
    pathname: `/${destination.name}/[id]` as
      '/profile/[id]' | '/match/[id]' | '/conversation/[id]' | '/booking/[id]',
    params: { id: destination.id },
  };
}

export function PendingNavigation() {
  const router = useRouter();
  const session = useSession();
  const pending = useNavigationStore((state) => state.pending);

  useEffect(() => {
    const userId = session.snapshot?.user.id;
    if (session.gate !== 'app' || !userId || !pending) return;
    const destination = useNavigationStore
      .getState()
      .consume(`${env.EXPO_PUBLIC_APP_ENV}:${userId}`);
    if (destination) router.push(hrefFor(destination));
  }, [pending, router, session.gate, session.snapshot?.user.id]);

  return null;
}
