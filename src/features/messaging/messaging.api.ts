import {
  messagingControllerConversation,
  messagingControllerConversations,
  messagingControllerMessages,
  messagingControllerReceipt,
  messagingControllerSend,
} from '@/generated/api/sdk.gen';
import type {
  ConversationPage,
  MessagePage,
  SendMessageDto,
} from '@/generated/api/types.gen';
import { unwrap } from '@/services/api/result';

import { reconcileMessages, type MessageView } from './messaging.types';

export const messagingApi = {
  async conversations(cursor?: string, signal?: AbortSignal) {
    const page: ConversationPage = unwrap(
      await messagingControllerConversations({
        query: { cursor, limit: 20 },
        signal,
      }),
    );
    return { items: page.items, nextCursor: page.nextCursor ?? undefined };
  },

  async conversation(conversationId: string, signal?: AbortSignal) {
    return unwrap(
      await messagingControllerConversation({
        path: { conversationId },
        signal,
      }),
    );
  },

  async messages(
    conversationId: string,
    cursor?: string,
    signal?: AbortSignal,
  ) {
    const page: MessagePage = unwrap(
      await messagingControllerMessages({
        path: { conversationId },
        query: { cursor, limit: 40 },
        signal,
      }),
    );
    return {
      items: page.items as MessageView[],
      nextCursor: page.nextCursor ?? undefined,
    };
  },

  async send(
    conversationId: string,
    input: SendMessageDto,
    signal?: AbortSignal,
  ) {
    return unwrap(
      await messagingControllerSend({
        path: { conversationId },
        body: input,
        signal,
      }),
    );
  },

  async receipt(
    conversationId: string,
    messageId: string,
    type: 'delivered' | 'read',
  ) {
    return unwrap(
      await messagingControllerReceipt({
        path: { conversationId, messageId },
        body: { type },
      }),
    );
  },

  reconcileMessages,
};
