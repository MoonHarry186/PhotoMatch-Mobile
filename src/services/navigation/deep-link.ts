import { z } from 'zod';

import {
  authDeepLinkSchema,
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

export function resolveAuthDeepLink(url: string) {
  try {
    const parsed = new URL(url);
    const pathSegments = parsed.pathname.split('/').filter(Boolean);
    const name =
      parsed.protocol === 'http:' || parsed.protocol === 'https:'
        ? pathSegments[0]
        : parsed.hostname;
    if (name !== 'verify-email' && name !== 'reset-password') return null;
    return authDeepLinkSchema.parse({
      version: 1,
      name,
      token: parsed.searchParams.get('token'),
    });
  } catch {
    return null;
  }
}
