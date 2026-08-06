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

import { normalizeMessageReceipts, reconcileMessages } from './messaging.types';

const receiptRequests = new Map<
  string,
  ReturnType<typeof messagingControllerReceipt>
>();
const completedReceipts = new Set<string>();

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
      items: page.items.map((message) => normalizeMessageReceipts(message)),
      nextCursor: page.nextCursor ?? undefined,
    };
  },

  async send(
    conversationId: string,
    input: SendMessageDto,
    signal?: AbortSignal,
  ) {
    const message = unwrap(
      await messagingControllerSend({
        path: { conversationId },
        body: input,
        signal,
      }),
    );
    return normalizeMessageReceipts(message);
  },

  receipt(
    conversationId: string,
    messageId: string,
    type: 'delivered' | 'read',
  ) {
    const key = `${conversationId}:${messageId}:${type}`;
    if (completedReceipts.has(key)) return Promise.resolve({ messageId, type });
    const inFlight = receiptRequests.get(key);
    if (inFlight) return inFlight.then(unwrap);

    // Provider và màn hình dùng chung request nếu cùng xác nhận một receipt.
    const request = messagingControllerReceipt({
      path: { conversationId, messageId },
      body: { type },
    });
    receiptRequests.set(key, request);
    return request.then(
      (result) => {
        receiptRequests.delete(key);
        const receipt = unwrap(result);
        completedReceipts.add(key);
        return receipt;
      },
      (error: unknown) => {
        receiptRequests.delete(key);
        throw error;
      },
    );
  },

  reconcileMessages,
};
