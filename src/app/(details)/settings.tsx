import { ErrorState } from '@/components/feedback';
import { useI18n } from '@/i18n/i18n-provider';
import { SettingsScreen } from '@/features/settings/settings-screen';
import { useSession } from '@/providers/session-provider';

export default function SettingsRoute() {
  const user = useSession().snapshot?.user;
  const { t } = useI18n();
  if (!user?.currentRoleId)
    return <ErrorState title={t('common.accessDenied')} />;
  return (
    <SettingsScreen scope={{ userId: user.id, roleId: user.currentRoleId }} />
  );
}
