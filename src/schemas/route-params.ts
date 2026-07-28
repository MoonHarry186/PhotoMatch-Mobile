import { z } from 'zod';

export const idRouteParamsSchema = z.object({ id: z.uuid() });
