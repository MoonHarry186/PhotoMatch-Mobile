import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Select } from '@/components/ui';
import { getUserErrorMessage, normalizeError } from '@/core/errors';
import type { RoleSummary } from '@/generated/api/types.gen';
import { useI18n } from '@/i18n/i18n-provider';
import { onboardingApi } from '@/features/onboarding/onboarding.api';
import { useSession } from '@/providers/session-provider';
import { useAccountStore } from '@/stores/account.store';
import { colors } from '@/theme';

export function isRoleScopedQueryKey(
  queryKey: QueryKey,
  userId: string,
  roleId: string,
) {
  return (
    queryKey[0] === 'private' &&
    queryKey[1] === userId &&
    queryKey[2] === roleId
  );
}

export async function clearPreviousRoleCache(
  queryClient: QueryClient,
  userId: string,
  roleId: string,
) {
  const predicate = (query: { queryKey: QueryKey }) =>
    isRoleScopedQueryKey(query.queryKey, userId, roleId);
  await queryClient.cancelQueries({ predicate });
  queryClient.removeQueries({ predicate });
}

export function RoleSwitcher({
  roles,
  userId,
  currentRoleId,
}: {
  roles: RoleSummary[];
  userId: string;
  currentRoleId?: string | null;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const session = useSession();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async (nextRoleId: string) => {
      const previousRoleId = currentRoleId;
      await onboardingApi.switchRole(nextRoleId);
      if (previousRoleId)
        await clearPreviousRoleCache(queryClient, userId, previousRoleId);
      useAccountStore.getState().setRoleId(nextRoleId);
      await queryClient.invalidateQueries({
        predicate: (query) =>
          isRoleScopedQueryKey(query.queryKey, userId, nextRoleId),
      });
      await session.reload({ refreshAccessToken: true });
    },
    onSuccess: () => {
      router.replace('/');
    },
    onError: (caught) => {
      setError(getUserErrorMessage(normalizeError(caught)));
    },
  });
  if (roles.length < 2) return null;
  return (
    <>
      <Select
        label={t('role.current')}
        value={currentRoleId ?? undefined}
        options={roles.map((role) => ({
          value: role.id,
          label:
            role.code === 'PHOTOGRAPHER'
              ? t('role.photographer')
              : t('role.customer'),
        }))}
        onChange={(value) => {
          if (typeof value !== 'string' || value === currentRoleId) return;
          setError(null);
          mutation.mutate(value);
        }}
      />
      {mutation.isPending ? <Text>{t('role.switching')}</Text> : null}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
    </>
  );
}
