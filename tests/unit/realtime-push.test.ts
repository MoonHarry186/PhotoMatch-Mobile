import {
  parsePushPayload,
  parseRealtimeEvent,
} from '@/schemas/runtime-contracts';

const id = '00000000-0000-4000-8000-000000000001';

describe('versioned realtime and push parsers', () => {
  it('normalizes backend receipt and booking event names', () => {
    expect(
      parseRealtimeEvent('message.read', {
        version: 1,
        conversationId: id,
        messageId: id,
      }),
    ).toEqual(expect.objectContaining({ type: 'message.read' }));
    expect(
      parseRealtimeEvent('booking.status_changed', {
        version: 1,
        bookingId: id,
      }),
    ).toEqual(expect.objectContaining({ type: 'booking.status_changed' }));
  });

  it('accepts conversation typing events', () => {
    expect(
      parseRealtimeEvent('conversation.typing', {
        version: 1,
        conversationId: id,
        userId: id,
        isTyping: true,
      }),
    ).toEqual(
      expect.objectContaining({
        type: 'conversation.typing',
        conversationId: id,
        userId: id,
        isTyping: true,
      }),
    );
  });

  it('infers compact API push payloads and rejects malformed values', () => {
    expect(parsePushPayload({ bookingId: id })).toEqual({
      version: 1,
      type: 'booking',
      bookingId: id,
    });
    expect(parsePushPayload({ bookingId: 'not-an-id' })).toBeNull();
  });
});
