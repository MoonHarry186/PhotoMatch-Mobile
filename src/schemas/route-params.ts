import { z } from 'zod';

export const idRouteParamsSchema = z.object({ id: z.uuid() });

export const conversationRouteParamsSchema = idRouteParamsSchema.extend({
  displayName: z.string().optional(),
  avatarAssetId: z.string().optional(),
  matchId: z.string().optional(),
  status: z.enum(['ACTIVE', 'CLOSED', 'BLOCKED']).optional(),
});
