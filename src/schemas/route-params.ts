import { z } from 'zod';

export const idRouteParamsSchema = z.object({ id: z.uuid() });
export const authTokenParamsSchema = z.object({ token: z.string().min(1) });
