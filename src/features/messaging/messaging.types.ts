import type {
  ConversationResponse,
  MessageResponse,
  ReceiptResponse,
} from '@/generated/api/types.gen';

export type MessageView = MessageResponse & {
  localStatus?: 'sending' | 'failed';
  receiptStatus?: 'delivered' | 'read';
};

export type ConversationSummary = {
  id: string;
  matchId: string;
  status: ConversationResponse['status'];
  displayName?: string | null;
  avatarAssetId?: string | null;
};

type MessageWithRuntimeReceipts = MessageResponse & {
  receipts?: {
    userId?: string;
    deliveredAt?: string | null;
    readAt?: string | null;
  }[];
};

export type ConversationPageResult = {
  items: ConversationResponse[];
  nextCursor?: string;
};

export type MessagePageResult = {
  items: MessageView[];
  nextCursor?: string;
};

export type MessageInfiniteData = {
  pages: MessagePageResult[];
  pageParams: unknown[];
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

export function normalizeMessageReceipts(
  message: MessageWithRuntimeReceipts,
): MessageView {
  // Backend hiện trả receipts trong projection dù OpenAPI chưa mô tả trường này.
  const { receipts, ...view } = message;
  const receiptStatus = receipts?.some((receipt) => Boolean(receipt.readAt))
    ? 'read'
    : receipts?.some((receipt) => Boolean(receipt.deliveredAt))
      ? 'delivered'
      : undefined;
  return receiptStatus ? { ...view, receiptStatus } : view;
}

function normalized(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

const fallbackIdentities = new WeakMap<object, string>();
let nextFallbackIdentity = 0;

export function getMessageIdentity(message: MessageView): string {
  // Ưu tiên client ID để nối optimistic message với ACK server/realtime.
  const clientMessageId = normalized(message.clientMessageId);
  if (clientMessageId) return `client:${clientMessageId}`;

  const id = normalized(message.id);
  if (id) return `server:${id}`;

  const existing = fallbackIdentities.get(message);
  if (existing) return existing;

  const identity = `fallback:${++nextFallbackIdentity}`;
  fallbackIdentities.set(message, identity);
  return identity;
}

export function isSameMessage(a: MessageView, b: MessageView): boolean {
  const aId = normalized(a.id);
  const bId = normalized(b.id);
  if (aId && bId && aId === bId) return true;

  const aClientMessageId = normalized(a.clientMessageId);
  const bClientMessageId = normalized(b.clientMessageId);
  return Boolean(
    aClientMessageId &&
    bClientMessageId &&
    aClientMessageId === bClientMessageId,
  );
}

export function reconcileMessages(
  current: MessageView[],
  incoming: MessageView[],
) {
  // Server ID là khóa ưu tiên; client ID nối optimistic message với ACK/socket.
  const byIdentity = new Map<string, MessageView>();
  const identityByClientMessageId = new Map<string, string>();
  const identityByServerId = new Map<string, string>();
  for (const item of [...current, ...incoming]) {
    const clientMessageId = normalized(item.clientMessageId);
    const serverId = normalized(item.id);
    const serverKey = serverId ? identityByServerId.get(serverId) : undefined;
    const clientKey = clientMessageId
      ? identityByClientMessageId.get(clientMessageId)
      : undefined;
    const key = serverKey ?? clientKey ?? getMessageIdentity(item);

    // Một ACK có cả hai ID có thể nối hai bản ghi cache rời nhau thành một bản ghi.
    if (serverKey && clientKey && serverKey !== clientKey) {
      const serverMessage = byIdentity.get(serverKey);
      const clientMessage = byIdentity.get(clientKey);
      if (serverMessage && clientMessage) {
        byIdentity.set(serverKey, mergeMessage(clientMessage, serverMessage));
        byIdentity.delete(clientKey);
        replaceIdentityAlias(identityByServerId, clientKey, serverKey);
        replaceIdentityAlias(identityByClientMessageId, clientKey, serverKey);
      }
    }

    const merged = mergeMessage(byIdentity.get(key), item);
    byIdentity.set(key, merged);
    const mergedClientMessageId = normalized(merged.clientMessageId);
    const mergedServerId = normalized(merged.id);
    if (mergedClientMessageId)
      identityByClientMessageId.set(mergedClientMessageId, key);
    if (mergedServerId) identityByServerId.set(mergedServerId, key);
  }
  return [...byIdentity.values()].sort((a, b) => {
    const sentAtDifference =
      new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime();
    return (
      sentAtDifference ||
      getMessageIdentity(a).localeCompare(getMessageIdentity(b))
    );
  });
}

function replaceIdentityAlias(
  aliases: Map<string, string>,
  from: string,
  to: string,
) {
  for (const [alias, identity] of aliases) {
    if (identity === from) aliases.set(alias, to);
  }
}

export function upsertNewestMessage(
  current: MessageInfiniteData | undefined,
  message: MessageView,
): MessageInfiniteData {
  const first = current?.pages[0];
  if (!current || !first) {
    return {
      pages: [{ items: [message] }],
      pageParams: [null],
    };
  }

  // Tin mới vào trang đầu; retry/ACK của tin cũ ở nguyên trang để không phá cursor.
  const existingPageIndex = current.pages.findIndex((page) =>
    page.items.some((item) => isSameMessage(item, message)),
  );
  const targetPageIndex = existingPageIndex >= 0 ? existingPageIndex : 0;

  return {
    ...current,
    pages: current.pages.map((page, index) => ({
      ...page,
      items:
        index === targetPageIndex
          ? reconcileMessages(page.items, [message])
          : page.items.filter((item) => !isSameMessage(item, message)),
    })),
  };
}

export function reconcileMessageInfiniteData(
  current: MessageInfiniteData | undefined,
  incoming: MessageInfiniteData,
): MessageInfiniteData {
  if (!current) return incoming;

  // Structural sharing giữ optimistic/failed message qua các lần refetch/reconnect.
  const pageCount = Math.max(current.pages.length, incoming.pages.length);
  const pages = Array.from({ length: pageCount }, (_, index) => {
    const currentPage = current.pages[index];
    const incomingPage = incoming.pages[index];
    if (!incomingPage) return currentPage!;
    if (!currentPage) return incomingPage;
    return {
      ...incomingPage,
      items: reconcileMessages(currentPage.items, incomingPage.items),
    };
  });
  return {
    ...incoming,
    pages,
    pageParams:
      incoming.pageParams.length >= current.pageParams.length
        ? incoming.pageParams
        : current.pageParams,
  };
}

export function markMessageSending(
  current: MessageInfiniteData | undefined,
  clientMessageId: string,
): MessageInfiniteData | undefined {
  if (!current) return current;
  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        item.clientMessageId === clientMessageId
          ? {
              ...item,
              status: 'SENT',
              localStatus: 'sending',
            }
          : item,
      ),
    })),
  };
}

function mergeMessage(
  current: MessageView | undefined,
  incoming: MessageView,
): MessageView {
  if (!current) return incoming;

  const merged: MessageView = { ...current, ...incoming };
  const incomingIsServerMessage =
    Boolean(incoming.id) && !incoming.id.startsWith('local-');

  // Receipt chỉ được tăng từ delivered lên read, không bị refetch cũ ghi đè.
  const receiptStatus = laterReceiptStatus(
    current.receiptStatus,
    incoming.receiptStatus,
  );
  if (receiptStatus) merged.receiptStatus = receiptStatus;

  if (incoming.localStatus) {
    // Retry chủ động được phép chuyển failed về sending.
    merged.localStatus = incoming.localStatus;
    merged.status = incoming.status;
  } else if (incomingIsServerMessage) {
    if (current.localStatus === 'sending' && incoming.status === 'FAILED') {
      // Server có thể từ chối ngay optimistic message trước khi đạt trạng thái sent.
      merged.localStatus = 'failed';
      merged.status = 'FAILED';
    } else {
      // Có server ID nghĩa là optimistic message đã được xác nhận.
      merged.localStatus = undefined;
      merged.status = laterServerStatus(current.status, incoming.status);
    }
  } else if (current.localStatus) {
    merged.localStatus = current.localStatus;
  }

  if (merged.receiptStatus) merged.status = 'DELIVERED';
  return merged;
}

function laterReceiptStatus(
  current: MessageView['receiptStatus'],
  incoming: MessageView['receiptStatus'],
): MessageView['receiptStatus'] {
  const rank = { delivered: 1, read: 2 } as const;
  if (!current) return incoming;
  if (!incoming) return current;
  return rank[current] >= rank[incoming] ? current : incoming;
}

function laterServerStatus(
  current: MessageView['status'],
  incoming: MessageView['status'],
): MessageView['status'] {
  const rank = { FAILED: 0, SENT: 1, DELIVERED: 2 } as const;
  return rank[current] >= rank[incoming] ? current : incoming;
}

export function markMessageFailed(
  current: MessageInfiniteData | undefined,
  clientMessageId: string,
): MessageInfiniteData | undefined {
  // Không tạo cache mới khi query chưa có dữ liệu, chỉ cập nhật message đang tồn tại.
  if (!current) return current;
  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        item.clientMessageId === clientMessageId &&
        (item.localStatus === 'sending' || item.id.startsWith('local-'))
          ? { ...item, localStatus: 'failed', status: 'FAILED' }
          : item,
      ),
    })),
  };
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
          status: 'DELIVERED',
          receiptStatus:
            message.receiptStatus === 'read' || receipt.type === 'read'
              ? 'read'
              : 'delivered',
        },
  );
}
