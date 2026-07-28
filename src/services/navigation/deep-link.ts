import { z } from 'zod';

import {
  deepLinkDestinationSchema,
  type DeepLinkDestination,
} from '@/schemas/runtime-contracts';

const routeSchema = z.tuple([
  z.enum(['profile', 'match', 'conversation', 'booking']),
  z.uuid(),
]);

export function resolveDeepLink(url: string): DeepLinkDestination | null {
  try {
    const parsed = new URL(url);
    const pathSegments = parsed.pathname.split('/').filter(Boolean);
    const segments =
      parsed.protocol === 'http:' || parsed.protocol === 'https:'
        ? pathSegments
        : [parsed.hostname, ...pathSegments];
    const candidate = routeSchema.safeParse(segments);
    if (!candidate.success) return null;
    return deepLinkDestinationSchema.parse({
      version: 1,
      name: candidate.data[0],
      id: candidate.data[1],
    });
  } catch {
    return null;
  }
}
