import { create } from 'zustand';

import { isSameMessage, type MessageView } from './messaging.types';

type MessagingState = {
  messages: Record<string, MessageView[]>;
  setMessages: (conversationId: string, value: MessageView[]) => void;
  appendMessage: (conversationId: string, value: MessageView) => void;
  clear: () => void;
};

export const useMessagingStore = create<MessagingState>((set) => ({
  messages: {},
  setMessages: (conversationId, value) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: value },
    })),
  appendMessage: (conversationId, value) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [
          ...(state.messages[conversationId] ?? []).filter(
            (item) => !isSameMessage(item, value),
          ),
          value,
        ],
      },
    })),
  clear: () => set({ messages: {} }),
}));
