import { ConversationList } from '@/features/messaging/conversation-list';
import { useSession } from '@/providers/session-provider';

export default function MessagesRoute() {
  const user = useSession().snapshot?.user;
  if (!user?.currentRoleId) return null;
  return (
    <ConversationList scope={{ userId: user.id, roleId: user.currentRoleId }} />
  );
}
