import { validateMedia } from '@/services/media/media-policy';
import {
  applyReceipt,
  reconcileMessages,
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
  });

  it('applies receipt without exposing the receipt payload', () => {
    const value = applyReceipt([{ ...base, id: 'server-1' }], {
      messageId: 'server-1',
      type: 'read',
      readReceiptShared: false,
    });
    expect(value[0]?.status).toBe('DELIVERED');
  });
});
