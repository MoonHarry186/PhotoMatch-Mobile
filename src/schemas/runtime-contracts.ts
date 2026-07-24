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
    ]),
    conversationId: id,
    messageId: id,
  }),
  z.object({ version, type: z.literal('match.created'), matchId: id }),
  z.object({
    version,
    type: z.enum(['booking.created', 'booking.status.changed']),
    bookingId: id,
  }),
]);

export const pushPayloadSchema = z.discriminatedUnion('type', [
  z.object({ version, type: z.literal('match'), matchId: id }),
  z.object({ version, type: z.literal('booking'), bookingId: id }),
  z.object({
    version,
    type: z.literal('system'),
    action: z.enum(['OPEN_SETTINGS', 'OPEN_HOME']),
  }),
]);

export const deepLinkDestinationSchema = z.discriminatedUnion('name', [
  z.object({ version, name: z.literal('profile'), id }),
  z.object({ version, name: z.literal('match'), id }),
  z.object({ version, name: z.literal('conversation'), id }),
  z.object({ version, name: z.literal('booking'), id }),
]);

export const authDeepLinkSchema = z.discriminatedUnion('name', [
  z.object({
    version,
    name: z.literal('verify-email'),
    token: z.string().min(1),
  }),
  z.object({
    version,
    name: z.literal('reset-password'),
    token: z.string().min(1),
  }),
]);

export type DeepLinkDestination = z.infer<typeof deepLinkDestinationSchema>;
