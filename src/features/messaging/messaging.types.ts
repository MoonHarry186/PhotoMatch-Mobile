import type {
  ConversationResponse,
  MessageResponse,
  ReceiptResponse,
} from '@/generated/api/types.gen';

export type MessageView = MessageResponse & {
  localStatus?: 'sending' | 'failed';
};

export type ConversationPageResult = {
  items: ConversationResponse[];
  nextCursor?: string;
};

export type MessagePageResult = {
  items: MessageView[];
  nextCursor?: string;
};

export type RealtimeMessageEvent = {
  version: 1;
  type: 'conversation.message.created';
  conversationId: string;
  id: string;
};

export type RealtimeReceiptEvent = {
  version: 1;
  type: 'conversation.message.delivered' | 'conversation.message.read';
  conversationId: string;
  messageId: string;
};

export function reconcileMessages(
  current: MessageView[],
  incoming: MessageView[],
) {
  const byIdentity = new Map<string, MessageView>();
  for (const item of [...current, ...incoming]) {
    const key = item.id || item.clientMessageId;
    byIdentity.set(key, { ...byIdentity.get(key), ...item });
    const duplicate = [...byIdentity.values()].find(
      (candidate) =>
        candidate.clientMessageId === item.clientMessageId &&
        candidate.id !== item.id,
    );
    if (duplicate) {
      byIdentity.delete(duplicate.id || duplicate.clientMessageId);
    }
  }
  return [...byIdentity.values()].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
  );
}

export function applyReceipt(
  messages: MessageView[],
  receipt: ReceiptResponse,
): MessageView[] {
  return messages.map((message) =>
    message.id !== receipt.messageId
      ? message
      : {
          ...message,
          status: receipt.type === 'read' ? 'DELIVERED' : 'DELIVERED',
        },
  );
}
