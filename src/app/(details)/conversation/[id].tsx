import { useLocalSearchParams } from 'expo-router';

import { ErrorState } from '@/components/feedback';
import { FeatureErrorBoundary } from '@/components/boundaries/FeatureErrorBoundary';
import { ConversationScreen } from '@/features/messaging/conversation-screen';
import { useSession } from '@/providers/session-provider';
import { idRouteParamsSchema } from '@/schemas/route-params';

export default function ConversationDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSession().snapshot?.user;
  const parsed = idRouteParamsSchema.safeParse({
    id: Array.isArray(id) ? id[0] : id,
  });
  if (!parsed.success)
    return <ErrorState title="Liên kết cuộc trò chuyện không hợp lệ" />;
  if (!user?.currentRoleId)
    return <ErrorState title="Chưa xác định được vai trò hiện tại" />;
  return (
    <FeatureErrorBoundary feature="chat">
      <ConversationScreen
        conversationId={parsed.data.id}
        scope={{ userId: user.id, roleId: user.currentRoleId }}
      />
    </FeatureErrorBoundary>
  );
}
