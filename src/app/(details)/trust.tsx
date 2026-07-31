import { ErrorState } from '@/components/feedback';
import { TrustScreen } from '@/features/trust/trust-screen';
import { useSession } from '@/providers/session-provider';

export default function TrustRoute() {
  const user = useSession().snapshot?.user;
  if (!user?.currentRoleId)
    return <ErrorState title="Chưa xác định được tài khoản" />;
  return (
    <TrustScreen scope={{ userId: user.id, roleId: user.currentRoleId }} />
  );
}
