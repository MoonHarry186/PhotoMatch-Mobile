import { z } from 'zod';

const id = z.uuid();
const version = z.literal(1);

export const realtimeEventSchema = z.discriminatedUnion('type', [
  z.object({
    version,
    type: z.literal('conversation.message.created'),
    conversationId: id,
    id,
  }),
  z.object({
    version,
    type: z.enum([
      'conversation.message.delivered',
      'conversation.message.read',
      'message.delivered',
      'message.read',
    ]),
    conversationId: id,
    messageId: id,
  }),
  z.object({ version, type: z.literal('match.created'), matchId: id }),
  z.object({
    version,
    type: z.enum([
      'booking.created',
      'booking.status.changed',
      'booking.status_changed',
    ]),
    bookingId: id,
  }),
]);

export function parseRealtimeEvent(
  eventName: string,
  payload: unknown,
): z.infer<typeof realtimeEventSchema> | null {
  if (!payload || typeof payload !== 'object') return null;
  const value = payload as Record<string, unknown>;
  const rawType =
    eventName || (typeof value.type === 'string' ? value.type : '');
  const type =
    rawType === 'message.read'
      ? 'message.read'
      : rawType === 'message.delivered'
        ? 'message.delivered'
        : rawType;
  const normalized = {
    ...value,
    version: value.version ?? 1,
    type,
    id: value.id ?? value.messageId,
  };
  const parsed = realtimeEventSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

export const pushPayloadSchema = z.discriminatedUnion('type', [
  z.object({ version, type: z.literal('match'), matchId: id }),
  z.object({ version, type: z.literal('booking'), bookingId: id }),
  z.object({
    version,
    type: z.literal('system'),
    action: z.enum(['OPEN_SETTINGS', 'OPEN_HOME']),
  }),
]);

export type PushPayload = z.infer<typeof pushPayloadSchema>;

/** Normalize the compact payload emitted by the API push worker. */
export function parsePushPayload(payload: unknown): PushPayload | null {
  if (!payload || typeof payload !== 'object') return null;
  const value = payload as Record<string, unknown>;
  const withVersion = { ...value, version: value.version ?? 1 };
  const typed = pushPayloadSchema.safeParse(withVersion);
  if (typed.success) return typed.data;
  if (typeof value.matchId === 'string') {
    const match = pushPayloadSchema.safeParse({
      version: 1,
      type: 'match',
      matchId: value.matchId,
    });
    return match.success ? match.data : null;
  }
  if (typeof value.bookingId === 'string') {
    const booking = pushPayloadSchema.safeParse({
      version: 1,
      type: 'booking',
      bookingId: value.bookingId,
    });
    return booking.success ? booking.data : null;
  }
  return null;
}

export const deepLinkDestinationSchema = z.discriminatedUnion('name', [
  z.object({ version, name: z.literal('profile'), id }),
  z.object({ version, name: z.literal('match'), id }),
  z.object({ version, name: z.literal('conversation'), id }),
  z.object({ version, name: z.literal('booking'), id }),
]);

export type DeepLinkDestination = z.infer<typeof deepLinkDestinationSchema>;
