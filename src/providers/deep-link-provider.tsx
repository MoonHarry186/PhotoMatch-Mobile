import * as Linking from 'expo-linking';
import { useEffect } from 'react';

import { env } from '@/config/env';
import { useSession } from '@/providers/session-provider';
import { resolveDeepLink } from '@/services/navigation/deep-link';
import { useNavigationStore } from '@/stores/navigation.store';

export function DeepLinkProvider({ children }: React.PropsWithChildren) {
  const session = useSession();
  const userId = session.snapshot?.user.id;
  useEffect(() => {
    const handle = (url: string) => {
      const destination = resolveDeepLink(url);
      if (destination) {
        const scope = userId
          ? `${env.EXPO_PUBLIC_APP_ENV}:${userId}`
          : `${env.EXPO_PUBLIC_APP_ENV}:pending-auth`;
        useNavigationStore.getState().queue(scope, destination);
      }
    };
    void Linking.getInitialURL().then((url) => {
      if (url) handle(url);
    });
    const subscription = Linking.addEventListener('url', ({ url }) =>
      handle(url),
    );
    return () => subscription.remove();
  }, [userId]);
  return children;
}
