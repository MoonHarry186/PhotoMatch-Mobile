import { ErrorState } from '@/components/feedback';
import { useI18n } from '@/i18n/i18n-provider';
import { TrustScreen } from '@/features/trust/trust-screen';
import { useSession } from '@/providers/session-provider';

export default function TrustRoute() {
  const user = useSession().snapshot?.user;
  const { t } = useI18n();
  if (!user?.currentRoleId)
    return <ErrorState title={t('common.accessDenied')} />;
  return (
    <TrustScreen scope={{ userId: user.id, roleId: user.currentRoleId }} />
  );
}
