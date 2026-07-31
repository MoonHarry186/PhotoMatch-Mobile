import { uploadsControllerAccessUrl } from '@/generated/api/sdk.gen';
import { unwrap } from '@/services/api/result';

type CachedUrl = { url: string; expiresAt: number };
const cache = new Map<string, CachedUrl>();
const EXPIRY_SKEW_MS = 15_000;

export async function getSignedAssetUrl(
  assetId: string,
  options: { forceRefresh?: boolean; signal?: AbortSignal } = {},
) {
  const cached = cache.get(assetId);
  if (
    !options.forceRefresh &&
    cached &&
    cached.expiresAt > Date.now() + EXPIRY_SKEW_MS
  ) {
    return cached.url;
  }
  const response = unwrap(
    await uploadsControllerAccessUrl({
      path: { assetId },
      signal: options.signal,
    }),
  );
  const expiresAt = response.expiresAt
    ? new Date(response.expiresAt).getTime()
    : Date.now() + 5 * 60_000;
  cache.set(assetId, { url: response.url, expiresAt });
  return response.url;
}

export function clearSignedAssetUrlCache() {
  cache.clear();
}
