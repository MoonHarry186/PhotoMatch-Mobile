jest.mock('@/generated/api/sdk.gen', () => ({
  messagingControllerConversation: jest.fn(),
  messagingControllerConversations: jest.fn(),
  messagingControllerMessages: jest.fn(),
  messagingControllerReceipt: jest.fn(),
  messagingControllerSend: jest.fn(),
}));

import { messagingControllerReceipt } from '@/generated/api/sdk.gen';
import { messagingApi } from '@/features/messaging/messaging.api';

const mockReceiptController = messagingControllerReceipt as jest.Mock;
const conversationId = '00000000-0000-4000-8000-000000000001';

describe('messaging API receipts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deduplicates an in-flight and completed receipt', async () => {
    const messageId = '00000000-0000-4000-8000-000000000002';
    mockReceiptController.mockResolvedValue({
      data: { messageId, type: 'delivered' },
    });

    await Promise.all([
      messagingApi.receipt(conversationId, messageId, 'delivered'),
      messagingApi.receipt(conversationId, messageId, 'delivered'),
    ]);
    await messagingApi.receipt(conversationId, messageId, 'delivered');

    expect(mockReceiptController).toHaveBeenCalledTimes(1);
  });

  it('allows retry when the generated client returns an error result', async () => {
    const messageId = '00000000-0000-4000-8000-000000000003';
    mockReceiptController
      .mockResolvedValueOnce({ error: { message: 'temporary' } })
      .mockResolvedValueOnce({
        data: { messageId, type: 'read' },
      });

    await expect(
      messagingApi.receipt(conversationId, messageId, 'read'),
    ).rejects.toBeDefined();
    await expect(
      messagingApi.receipt(conversationId, messageId, 'read'),
    ).resolves.toEqual({ messageId, type: 'read' });

    expect(mockReceiptController).toHaveBeenCalledTimes(2);
  });
});
