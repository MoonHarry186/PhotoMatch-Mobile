import { useLocalSearchParams } from 'expo-router';

import { ErrorState } from '@/components/feedback';
import { useI18n } from '@/i18n/i18n-provider';
import { FeatureErrorBoundary } from '@/components/boundaries/FeatureErrorBoundary';
import { ConversationScreen } from '@/features/messaging/conversation-screen';
import { useSession } from '@/providers/session-provider';
import { conversationRouteParamsSchema } from '@/schemas/route-params';

export default function ConversationDetailRoute() {
  const params = useLocalSearchParams<{
    id: string;
    displayName?: string;
    avatarAssetId?: string;
    matchId?: string;
    status?: string;
  }>();
  const user = useSession().snapshot?.user;
  const { t } = useI18n();
  const firstParam = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const parsed = conversationRouteParamsSchema.safeParse({
    id: firstParam(params.id),
    displayName: firstParam(params.displayName),
    avatarAssetId: firstParam(params.avatarAssetId),
    matchId: firstParam(params.matchId),
    status: firstParam(params.status),
  });
  if (!parsed.success) return <ErrorState title={t('common.invalidLink')} />;
  if (!user?.currentRoleId) return <ErrorState title={t('role.current')} />;
  return (
    <FeatureErrorBoundary feature="chat">
      <ConversationScreen
        conversationId={parsed.data.id}
        scope={{ userId: user.id, roleId: user.currentRoleId }}
        initialSummary={
          parsed.data.matchId && parsed.data.status
            ? {
                id: parsed.data.id,
                matchId: parsed.data.matchId,
                status: parsed.data.status,
                displayName: parsed.data.displayName,
                avatarAssetId: parsed.data.avatarAssetId,
              }
            : undefined
        }
      />
    </FeatureErrorBoundary>
  );
}
