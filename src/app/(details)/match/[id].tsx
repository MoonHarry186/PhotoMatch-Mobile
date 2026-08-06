import { useLocalSearchParams } from 'expo-router';

import { ErrorState } from '@/components/feedback';
import { useI18n } from '@/i18n/i18n-provider';
import { MatchDetailScreen } from '@/features/discovery/match-detail-screen';
import { useSession } from '@/providers/session-provider';
import { idRouteParamsSchema } from '@/schemas/route-params';

export default function MatchDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSession().snapshot?.user;
  const { t } = useI18n();
  const parsed = idRouteParamsSchema.safeParse({
    id: Array.isArray(id) ? id[0] : id,
  });
  if (!parsed.success) return <ErrorState title={t('common.invalidLink')} />;
  if (!user?.currentRoleId) return <ErrorState title={t('role.current')} />;
  return (
    <MatchDetailScreen
      matchId={parsed.data.id}
      scope={{ userId: user.id, roleId: user.currentRoleId }}
    />
  );
}
