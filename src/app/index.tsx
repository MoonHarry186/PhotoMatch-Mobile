import { Redirect } from 'expo-router';

import { BrandedSplash, ErrorState, OfflineState } from '@/components/feedback';
import { getUserErrorMessage, normalizeError } from '@/core/errors';
import { useSession } from '@/providers/session-provider';

export default function BootstrapRoute() {
  const session = useSession();
  if (session.status === 'booting') return <BrandedSplash />;
  if (session.status === 'offline')
    return <OfflineState onAction={() => void session.reload()} />;
  if (session.status === 'error') {
    return (
      <ErrorState
        description={
          session.error
            ? getUserErrorMessage(normalizeError(session.error))
            : undefined
        }
        onAction={() => void session.reload()}
      />
    );
  }
  switch (session.gate) {
    case 'signed-out':
      return <Redirect href="/(auth)/sign-in" />;
    case 'verification':
      return <Redirect href="/(auth)/verify-email" />;
    case 'restriction':
      return <Redirect href="/(public)/restriction" />;
    case 'onboarding':
      return <Redirect href="/(onboarding)" />;
    case 'app':
      return <Redirect href="/(tabs)/discovery" />;
  }
}
