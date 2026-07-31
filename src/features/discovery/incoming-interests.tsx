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
        onFeedback('Đã chấp nhận. Kết nối và cuộc trò chuyện đã sẵn sàng.');
        router.push({
          pathname: '/(details)/match/[id]',
          params: { id: response.matchId },
        });
      } else {
        onFeedback('Đã từ chối yêu cầu quan tâm.');
      }
    },
  });
  const items = incoming.data?.pages.flatMap((page) => page.items) ?? [];
  const normalizedError = mutation.error
    ? normalizeError(mutation.error)
    : null;

  if (incoming.isPending)
    return <LoadingState label="Đang tải yêu cầu quan tâm…" />;
  if (incoming.isError)
    return (
      <ErrorState
        title="Không thể tải yêu cầu"
        primaryActionLabel="Thử lại"
        onPrimaryAction={() => void incoming.refetch()}
      />
    );
  if (!items.length)
    return (
      <EmptyState
        title="Chưa có yêu cầu mới"
        message="Khi Customer quan tâm đến bạn, yêu cầu sẽ xuất hiện tại đây."
      />
    );

  return (
    <View style={styles.list}>
      {normalizedError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {relationshipErrorMessage(normalizedError) ??
            getUserErrorMessage(normalizedError)}
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
          label="Xem thêm yêu cầu"
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
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Mở hồ sơ ${interest.customer.displayName}`}
        onPress={onOpenProfile}
        style={styles.summary}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {interest.customer.displayName.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.name}>{interest.customer.displayName}</Text>
          <Text style={styles.meta}>
            {interest.customer.city ?? 'Chưa cập nhật thành phố'} ·{' '}
            {new Date(interest.createdAt).toLocaleDateString('vi-VN')}
          </Text>
          <View style={styles.badges}>
            <StatusBadge label="Đang chờ phản hồi" tone="warning" />
            {interest.customer.verified ? (
              <StatusBadge label="Đã xác minh" tone="success" />
            ) : null}
          </View>
        </View>
      </Pressable>
      <View style={styles.actions}>
        <View style={styles.flex}>
          <Button
            label="Từ chối"
            variant="secondary"
            disabled={pending}
            onPress={onReject}
          />
        </View>
        <View style={styles.flex}>
          <Button label="Chấp nhận" disabled={pending} onPress={onAccept} />
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
  const accepting = decision?.value === 'ACCEPT';
  return (
    <ConfirmDialog
      visible={Boolean(decision)}
      title={
        accepting
          ? `Kết nối với ${decision?.interest.customer.displayName}?`
          : `Từ chối ${decision?.interest.customer.displayName}?`
      }
      message={
        accepting
          ? 'Chấp nhận sẽ tạo hoặc khôi phục một kết nối và cuộc trò chuyện theo kết quả canonical từ server.'
          : 'Yêu cầu sẽ được giải quyết và không còn nằm trong danh sách đang chờ.'
      }
      confirmLabel={accepting ? 'Chấp nhận' : 'Từ chối'}
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
