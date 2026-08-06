import { buildMessageRows } from '@/features/messaging/conversation-screen.logic';
import { conversationMessagesOptions } from '@/features/messaging/messaging.queries';
import type { MessageView } from '@/features/messaging/messaging.types';
import type { Translate } from '@/i18n/i18n-provider';
import { messages } from '@/i18n/messages';
import { queryKeys } from '@/services/api/query-keys';

const translate: Translate = (key) => messages.vi[key];

function message(id: string, sentAt: Date): MessageView {
  return {
    id,
    conversationId: 'conversation-1',
    senderUserId: 'user-1',
    clientMessageId: `client-${id}`,
    messageType: 'TEXT',
    content: id,
    status: 'SENT',
    sentAt: sentAt.toISOString(),
  };
}

describe('conversation screen logic', () => {
  it('uses one exact cache key for HTTP and realtime message updates', () => {
    expect(
      queryKeys.conversationMessages(
        { userId: 'user-1', roleId: 'role-1' },
        'conversation-1',
      ),
    ).toEqual([
      'private',
      'user-1',
      'role-1',
      'conversation',
      'detail',
      'conversation-1',
      'messages',
      'conversation-1',
    ]);
  });

  it('shares cache-first options for message queries and prefetch', () => {
    const options = conversationMessagesOptions(
      { userId: 'user-1', roleId: 'role-1' },
      'conversation-1',
    );

    expect(options.queryKey).toEqual(
      queryKeys.conversationMessages(
        { userId: 'user-1', roleId: 'role-1' },
        'conversation-1',
      ),
    );
    expect(options.initialPageParam).toBeNull();
    expect(options.staleTime).toBe(30_000);
    expect(options.gcTime).toBe(30 * 60_000);
    expect(options.refetchOnWindowFocus).toBe(false);
    expect(options.refetchOnReconnect).toBe(true);
    expect(options.retry).toBe(1);
  });

  it('inserts date separators when the calendar day changes', () => {
    const now = new Date(2026, 7, 5, 12, 0, 0);
    const rows = buildMessageRows(
      [
        message('older', new Date(2026, 7, 3, 9, 0, 0)),
        message('yesterday', new Date(2026, 7, 4, 9, 0, 0)),
        message('today-1', new Date(2026, 7, 5, 9, 0, 0)),
        message('today-2', new Date(2026, 7, 5, 10, 0, 0)),
      ],
      'vi',
      translate,
      now,
    );

    expect(rows.map((row) => row.kind)).toEqual([
      'date',
      'message',
      'date',
      'message',
      'date',
      'message',
      'message',
    ]);
    expect(
      rows.filter((row) => row.kind === 'date').map((row) => row.label),
    ).toEqual([expect.any(String), 'Hôm qua', 'Hôm nay']);
  });
});
