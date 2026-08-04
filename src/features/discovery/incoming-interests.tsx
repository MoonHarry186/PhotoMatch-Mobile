import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/domain';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { Button, ConfirmDialog } from '@/components/ui';
import { getUserErrorMessage, normalizeError } from '@/core/errors';
import { useI18n } from '@/i18n/i18n-provider';
import { createSubmissionKey } from '@/services/api/idempotency';
import { queryKeys } from '@/services/api/query-keys';
import { colors, elevation, radius, spacing, typography } from '@/theme';

import { discoveryApi } from './discovery.api';
import {
  relationshipErrorMessage,
  type IncomingInterest,
} from './discovery.types';

type Decision = {
  interest: IncomingInterest;
  value: 'ACCEPT' | 'REJECT';
};

export function IncomingInterests({
  scope,
  onFeedback,
}: {
  scope: { userId: string; roleId: string };
  onFeedback: (message: string) => void;
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<Decision | null>(null);
  const keys = useRef(
    new Map<string, ReturnType<typeof createSubmissionKey>>(),
  );
  const incoming = useInfiniteQuery({
    queryKey: queryKeys.interests(scope),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      discoveryApi.incoming(pageParam, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const mutation = useMutation({
    mutationFn: async (next: Decision) => {
      const identity = `${next.interest.id}:${next.value}`;
      let key = keys.current.get(identity);
      if (!key) {
        key = createSubmissionKey();
        keys.current.set(identity, key);
      }
      return {
        response: await discoveryApi.decide(
          next.interest.id,
          next.value,
          key.current(),
        ),
        identity,
      };
    },
    onSuccess: async ({ response, identity }) => {
      keys.current.get(identity)?.complete();
      keys.current.delete(identity);
      setDecision(null);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.interests(scope),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.matches(scope),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations(scope),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.discoveryRoot(scope),
        }),
      ]);
      if (response.decision === 'ACCEPT' && response.matchId) {
        onFeedback(t('discovery.interests.acceptedFeedback'));
        router.push({
          pathname: '/(details)/match/[id]',
          params: { id: response.matchId },
        });
      } else {
        onFeedback(t('discovery.interests.rejectedFeedback'));
      }
    },
  });
  const items = incoming.data?.pages.flatMap((page) => page.items) ?? [];
  const normalizedError = mutation.error
    ? normalizeError(mutation.error)
    : null;

  if (incoming.isPending)
    return <LoadingState label={t('discovery.interests.loading')} />;
  if (incoming.isError)
    return (
      <ErrorState
        title={t('discovery.interests.error')}
        primaryActionLabel={t('common.retry')}
        onPrimaryAction={() => void incoming.refetch()}
      />
    );
  if (!items.length)
    return (
      <EmptyState
        title={t('discovery.interests.empty')}
        message={t('discovery.interests.emptyMessage')}
      />
    );

  return (
    <View style={styles.list}>
      {normalizedError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {relationshipErrorMessage(normalizedError, locale) ??
            getUserErrorMessage(normalizedError, locale)}
        </Text>
      ) : null}
      {items.map((interest) => (
        <InterestCard
          key={interest.id}
          interest={interest}
          pending={mutation.isPending}
          onOpenProfile={() =>
            router.push({
              pathname: '/(details)/profile/[id]',
              params: { id: interest.customer.userRoleId },
            })
          }
          onAccept={() => setDecision({ interest, value: 'ACCEPT' })}
          onReject={() => setDecision({ interest, value: 'REJECT' })}
        />
      ))}
      {incoming.hasNextPage ? (
        <Button
          label={t('discovery.interests.loadMore')}
          variant="secondary"
          loading={incoming.isFetchingNextPage}
          onPress={() => void incoming.fetchNextPage()}
        />
      ) : null}
      <DecisionConfirmation
        decision={decision}
        loading={mutation.isPending}
        onConfirm={() => {
          if (decision) mutation.mutate(decision);
        }}
        onCancel={() => setDecision(null)}
      />
    </View>
  );
}

function InterestCard({
  interest,
  pending,
  onOpenProfile,
  onAccept,
  onReject,
}: {
  interest: IncomingInterest;
  pending: boolean;
  onOpenProfile: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  const { locale, t } = useI18n();
  const name = interest.customer.displayName || t('discovery.default.customer');
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('discovery.interests.openProfile', { name })}
        onPress={onOpenProfile}
        style={styles.summary}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {name.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta}>
            {interest.customer.city ?? t('discovery.interests.cityUnknown')} ·{' '}
            {new Date(interest.createdAt).toLocaleDateString(
              locale === 'vi' ? 'vi-VN' : 'en-US',
            )}
          </Text>
          <View style={styles.badges}>
            <StatusBadge
              label={t('discovery.interests.pending')}
              tone="warning"
            />
            {interest.customer.verified ? (
              <StatusBadge
                label={t('discovery.interests.verified')}
                tone="success"
              />
            ) : null}
          </View>
        </View>
      </Pressable>
      <View style={styles.actions}>
        <View style={styles.flex}>
          <Button
            label={t('discovery.interests.reject')}
            variant="secondary"
            disabled={pending}
            onPress={onReject}
          />
        </View>
        <View style={styles.flex}>
          <Button
            label={t('discovery.interests.accept')}
            disabled={pending}
            onPress={onAccept}
          />
        </View>
      </View>
    </View>
  );
}

function DecisionConfirmation({
  decision,
  loading,
  onConfirm,
  onCancel,
}: {
  decision: Decision | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const accepting = decision?.value === 'ACCEPT';
  const name =
    decision?.interest.customer.displayName || t('discovery.default.customer');
  return (
    <ConfirmDialog
      visible={Boolean(decision)}
      title={
        accepting
          ? t('discovery.interests.acceptTitle', { name })
          : t('discovery.interests.rejectTitle', { name })
      }
      message={
        accepting
          ? t('discovery.interests.acceptMessage')
          : t('discovery.interests.rejectMessage')
      }
      confirmLabel={
        accepting
          ? t('discovery.interests.accept')
          : t('discovery.interests.reject')
      }
      destructive={!accepting}
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.lg },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.light.surface,
    ...elevation.card,
  },
  summary: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: colors.light.infoContainer,
  },
  avatarText: {
    color: colors.brand,
    fontFamily: typography.bold,
    fontSize: 22,
  },
  flex: { flex: 1, gap: spacing.xs },
  name: {
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 18,
  },
  meta: { color: colors.light.muted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.md },
  error: { color: colors.danger },
});
