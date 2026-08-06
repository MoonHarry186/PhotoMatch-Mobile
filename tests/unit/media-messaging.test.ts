import { validateMedia } from '@/services/media/media-policy';
import {
  applyReceipt,
  getMessageIdentity,
  isSameMessage,
  markMessageFailed,
  markMessageSending,
  normalizeMessageReceipts,
  reconcileMessages,
  upsertNewestMessage,
  type MessageInfiniteData,
  type MessageView,
} from '@/features/messaging/messaging.types';

describe('media policy', () => {
  it('accepts supported image and derives extension', () => {
    expect(
      validateMedia('AVATAR', {
        uri: 'file:///avatar',
        fileName: 'avatar.JPG',
        mimeType: 'IMAGE/JPEG',
        fileSize: 100,
      }),
    ).toEqual(
      expect.objectContaining({ mimeType: 'image/jpeg', extension: 'jpg' }),
    );
  });

  it('rejects unsafe type and oversized file', () => {
    expect(() =>
      validateMedia('CHAT_IMAGE', {
        uri: 'file:///x.exe',
        fileName: 'x.exe',
        mimeType: 'application/octet-stream',
      }),
    ).toThrow(expect.objectContaining({ code: 'MEDIA_MIME_NOT_ALLOWED' }));
    expect(() =>
      validateMedia('CHAT_FILE', {
        uri: 'file:///x.pdf',
        fileName: 'x.pdf',
        mimeType: 'application/pdf',
        fileSize: 26 * 1024 * 1024,
      }),
    ).toThrow('vượt quá');
  });
});

describe('message reconciliation', () => {
  const base = {
    conversationId: '00000000-0000-4000-8000-000000000001',
    senderUserId: '00000000-0000-4000-8000-000000000002',
    clientMessageId: 'client-1',
    messageType: 'TEXT' as const,
    status: 'SENT' as const,
    sentAt: '2026-01-01T00:00:00.000Z',
  };
  it('deduplicates HTTP ack and realtime copy by clientMessageId', () => {
    const value = reconcileMessages(
      [{ ...base, id: 'local-client-1', content: 'Xin chào' }],
      [{ ...base, id: 'server-1', content: 'Xin chào' }],
    );
    expect(value).toHaveLength(1);
    expect(value[0]?.id).toBe('server-1');
    expect(value[0]?.localStatus).toBeUndefined();
  });

  it('keeps repeated content as separate messages when IDs differ', () => {
    const value = reconcileMessages(
      [],
      [
        { ...base, id: 'server-1', content: 'Hello' },
        {
          ...base,
          id: 'server-2',
          clientMessageId: 'client-2',
          sentAt: '2026-01-01T00:00:01.000Z',
          content: 'Hello',
        },
        {
          ...base,
          id: 'server-3',
          clientMessageId: 'client-3',
          sentAt: '2026-01-01T00:00:02.000Z',
          content: 'Hello',
        },
      ],
    );

    expect(value).toHaveLength(3);
    expect(value.map((item) => item.id)).toEqual([
      'server-1',
      'server-2',
      'server-3',
    ]);
  });

  it('does not use content to merge messages without IDs', () => {
    const first = {
      ...base,
      id: undefined,
      clientMessageId: undefined,
      content: 'Hello',
    } as unknown as MessageView;
    const second = {
      ...first,
    };

    expect(reconcileMessages([], [first, second])).toHaveLength(2);
    expect(isSameMessage(first, second)).toBe(false);
  });

  it('returns a stable fallback identity for incomplete messages', () => {
    const incomplete = {
      ...base,
      id: undefined,
      clientMessageId: undefined,
    } as unknown as MessageView;

    expect(getMessageIdentity(incomplete)).toContain('fallback:');
    expect(reconcileMessages([], [incomplete])).toHaveLength(1);
  });

  it('applies receipt without exposing the receipt payload', () => {
    const value = applyReceipt([{ ...base, id: 'server-1' }], {
      messageId: 'server-1',
      type: 'read',
      readReceiptShared: false,
    });
    expect(value[0]?.status).toBe('DELIVERED');
    expect(value[0]?.receiptStatus).toBe('read');
  });

  it('restores receipt status from the runtime history projection', () => {
    expect(
      normalizeMessageReceipts({
        ...base,
        id: 'server-1',
        receipts: [
          {
            userId: 'counterpart-1',
            deliveredAt: '2026-01-01T00:00:01.000Z',
            readAt: '2026-01-01T00:00:02.000Z',
          },
        ],
      }),
    ).toEqual(
      expect.objectContaining({
        receiptStatus: 'read',
      }),
    );
  });

  it('never lets an older event regress a seen receipt', () => {
    const seen = {
      ...base,
      id: 'server-1',
      status: 'DELIVERED' as const,
      receiptStatus: 'read' as const,
    };
    const afterDelivered = applyReceipt([seen], {
      messageId: 'server-1',
      type: 'delivered',
    });
    const afterStaleRefetch = reconcileMessages(afterDelivered, [
      { ...base, id: 'server-1', status: 'SENT' },
    ]);

    expect(afterStaleRefetch[0]).toEqual(
      expect.objectContaining({
        status: 'DELIVERED',
        receiptStatus: 'read',
      }),
    );
  });

  it('bridges separate server and optimistic records when an ACK has both IDs', () => {
    const serverOnly = {
      ...base,
      id: 'server-1',
      clientMessageId: undefined,
    } as unknown as MessageView;
    const optimisticOnly = {
      ...base,
      id: 'local-client-1',
      localStatus: 'sending' as const,
    };
    const ack = { ...base, id: 'server-1' };

    expect(reconcileMessages([serverOnly, optimisticOnly], [ack])).toEqual([
      expect.objectContaining({
        id: 'server-1',
        clientMessageId: 'client-1',
        localStatus: undefined,
      }),
    ]);
  });

  it('settles an optimistic message only in the newest page', () => {
    const optimistic = {
      ...base,
      id: 'local-client-1',
      content: 'Hello',
      localStatus: 'sending' as const,
    };
    const current: MessageInfiniteData = {
      pages: [
        { items: [optimistic], nextCursor: 'older-page' },
        { items: [optimistic], nextCursor: undefined },
      ],
      pageParams: [null, 'older-page'],
    };

    const value = upsertNewestMessage(current, {
      ...base,
      id: 'server-1',
      content: 'Hello',
    });

    expect(value.pages[0]?.items).toEqual([
      expect.objectContaining({ id: 'server-1', localStatus: undefined }),
    ]);
    expect(value.pages[0]?.nextCursor).toBe('older-page');
    expect(value.pages[1]?.items).toEqual([]);
    expect(value.pageParams).toEqual([null, 'older-page']);
  });

  it('marks a send failure without corrupting infinite-query pagination', () => {
    const current: MessageInfiniteData = {
      pages: [
        {
          items: [{ ...base, id: 'local-client-1', content: 'Hello' }],
          nextCursor: 'older-page',
        },
      ],
      pageParams: [null],
    };

    const value = markMessageFailed(current, base.clientMessageId);

    expect(value?.pages[0]?.items[0]).toEqual(
      expect.objectContaining({ localStatus: 'failed', status: 'FAILED' }),
    );
    expect(value?.pages[0]?.nextCursor).toBe('older-page');
    expect(value?.pageParams).toEqual([null]);
  });

  it('does not let a late HTTP error overwrite a server ACK', () => {
    const current: MessageInfiniteData = {
      pages: [
        {
          items: [{ ...base, id: 'server-1', content: 'Hello' }],
        },
      ],
      pageParams: [null],
    };

    expect(
      markMessageFailed(current, base.clientMessageId)?.pages[0]?.items[0],
    ).toEqual(expect.objectContaining({ status: 'SENT' }));
  });

  it('turns an optimistic message into failed when the server rejects it', () => {
    const optimistic = {
      ...base,
      id: 'local-client-1',
      localStatus: 'sending' as const,
    };

    expect(
      reconcileMessages(
        [optimistic],
        [{ ...base, id: 'server-1', status: 'FAILED' }],
      )[0],
    ).toEqual(
      expect.objectContaining({
        id: 'server-1',
        status: 'FAILED',
        localStatus: 'failed',
      }),
    );
  });

  it('moves only the selected failed message back to sending', () => {
    const current: MessageInfiniteData = {
      pages: [
        {
          items: [
            {
              ...base,
              id: 'local-client-1',
              status: 'FAILED',
              localStatus: 'failed',
            },
          ],
        },
      ],
      pageParams: [null],
    };

    expect(
      markMessageSending(current, base.clientMessageId)?.pages[0]?.items[0],
    ).toEqual(
      expect.objectContaining({ status: 'SENT', localStatus: 'sending' }),
    );
  });

  it('keeps a retried historical message in its original page', () => {
    const current: MessageInfiniteData = {
      pages: [
        {
          items: [
            {
              ...base,
              id: 'server-new',
              clientMessageId: 'client-new',
            },
          ],
          nextCursor: 'older-page',
        },
        {
          items: [
            {
              ...base,
              id: 'local-client-1',
              localStatus: 'sending',
            },
          ],
        },
      ],
      pageParams: [null, 'older-page'],
    };

    const value = upsertNewestMessage(current, {
      ...base,
      id: 'server-old',
    });

    expect(value.pages[0]?.items).toHaveLength(1);
    expect(value.pages[1]?.items).toEqual([
      expect.objectContaining({ id: 'server-old', localStatus: undefined }),
    ]);
  });
});
