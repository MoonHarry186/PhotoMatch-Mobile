export type OAuthResponseLike = {
  type: string;
  authentication?: { idToken?: string | null } | null;
  params?: Record<string, string>;
};

export type OAuthResponseOutcome =
  | { kind: 'cancel' }
  | { kind: 'failure' }
  | { kind: 'success'; idToken: string };

export function oauthResponseOutcome(
  response: OAuthResponseLike,
): OAuthResponseOutcome {
  if (response.type === 'cancel' || response.type === 'dismiss') {
    return { kind: 'cancel' };
  }
  if (response.type !== 'success') return { kind: 'failure' };
  const idToken = response.authentication?.idToken ?? response.params?.id_token;
  return idToken ? { kind: 'success', idToken } : { kind: 'failure' };
}

export function isOAuthCancellation(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'ERR_REQUEST_CANCELED'
  );
}
