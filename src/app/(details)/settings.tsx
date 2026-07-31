import { ErrorState } from '@/components/feedback';
import { SettingsScreen } from '@/features/settings/settings-screen';
import { useSession } from '@/providers/session-provider';

export default function SettingsRoute() {
  const user = useSession().snapshot?.user;
  if (!user?.currentRoleId)
    return <ErrorState title="Chưa xác định được tài khoản" />;
  return (
    <SettingsScreen scope={{ userId: user.id, roleId: user.currentRoleId }} />
  );
}
