type Scope = { userId: string; roleId?: string | null };

const scope = ({ userId, roleId }: Scope) =>
  ['private', userId, roleId ?? 'no-role'] as const;

export const queryKeys = {
  me: (value: Scope) => [...scope(value), 'me'] as const,
  selfProfile: (value: Scope) => [...scope(value), 'self-profile'] as const,
  availableRoles: (value: Scope) =>
    [...scope(value), 'available-roles'] as const,
  activityFields: (value: Scope) =>
    [...scope(value), 'activity-fields'] as const,
  selectedServices: (value: Scope) =>
    [...scope(value), 'selected-services'] as const,
  photographerProfile: (value: Scope) =>
    [...scope(value), 'photographer-profile'] as const,
  portfolio: (value: Scope) => [...scope(value), 'portfolio'] as const,
  settings: (value: Scope) => [...scope(value), 'settings'] as const,
  presence: (value: Scope) => [...scope(value), 'presence'] as const,
  assetUrl: (value: Scope, assetId: string) =>
    [...scope(value), 'asset', assetId] as const,
  restrictions: (value: Scope) => [...scope(value), 'restrictions'] as const,
  consents: (value: Scope) => [...scope(value), 'consents'] as const,
  onboarding: (value: Scope) => [...scope(value), 'onboarding'] as const,
  discovery: (value: Scope, filters: object, cursor?: string) =>
    [...scope(value), 'discovery', filters, cursor ?? 'first'] as const,
  detail: (value: Scope, entity: string, id: string) =>
    [...scope(value), entity, 'detail', id] as const,
  public: (entity: string, filters?: object) =>
    ['public', entity, filters ?? {}] as const,
  publicProfile: (userRoleId: string) =>
    ['public', 'profile', userRoleId] as const,
  publicPortfolio: (roleId: string, cursor?: string) =>
    ['public', 'portfolio', roleId, cursor ?? 'first'] as const,
  publicReviews: (roleId: string, cursor?: string) =>
    ['public', 'reviews', roleId, cursor ?? 'first'] as const,
};
