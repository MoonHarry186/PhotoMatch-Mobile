import { Redirect } from 'expo-router';

import { BrandedSplash, ErrorState, OfflineState } from '@/components/feedback';
import { useSession } from '@/providers/session-provider';

export default function BootstrapRoute() {
  const session = useSession();
  if (session.status === 'booting') return <BrandedSplash />;
  if (session.status === 'offline')
    return <OfflineState onAction={() => void session.reload()} />;
  if (session.status === 'error') {
    return (
      <ErrorState
        message={session.error?.message}
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
    case 'legal':
      return <Redirect href="/(public)/legal/consent" />;
    case 'onboarding':
      return <Redirect href="/(onboarding)" />;
    case 'app':
      return <Redirect href="/(tabs)/discovery" />;
  }
}
