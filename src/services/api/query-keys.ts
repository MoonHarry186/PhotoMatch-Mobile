type Scope = { userId: string; roleId?: string | null };

const scope = ({ userId, roleId }: Scope) =>
  ['private', userId, roleId ?? 'no-role'] as const;

export const queryKeys = {
  me: (value: Scope) => [...scope(value), 'me'] as const,
  restrictions: (value: Scope) => [...scope(value), 'restrictions'] as const,
  consents: (value: Scope) => [...scope(value), 'consents'] as const,
  onboarding: (value: Scope) => [...scope(value), 'onboarding'] as const,
  discovery: (value: Scope, filters: object, cursor?: string) =>
    [...scope(value), 'discovery', filters, cursor ?? 'first'] as const,
  detail: (value: Scope, entity: string, id: string) =>
    [...scope(value), entity, 'detail', id] as const,
  public: (entity: string, filters?: object) =>
    ['public', entity, filters ?? {}] as const,
};
