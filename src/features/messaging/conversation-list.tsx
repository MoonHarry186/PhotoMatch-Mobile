import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui';
import { queryKeys } from '@/services/api/query-keys';
import { colors, elevation, radius, spacing, typography } from '@/theme';

import { messagingApi } from './messaging.api';

export function ConversationList({
  scope,
}: {
  scope: { userId: string; roleId: string };
}) {
  const router = useRouter();
  const conversations = useInfiniteQuery({
    queryKey: queryKeys.conversations(scope),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      messagingApi.conversations(pageParam, signal),
    getNextPageParam: (page) => page.nextCursor,
  });
  const items = conversations.data?.pages.flatMap((page) => page.items) ?? [];
  if (conversations.isPending)
    return <LoadingState label="Đang tải cuộc trò chuyện…" />;
  if (conversations.isError) {
    return (
      <ErrorState
        title="Không thể tải tin nhắn"
        primaryActionLabel="Thử lại"
        onPrimaryAction={() => void conversations.refetch()}
      />
    );
  }
  if (!items.length)
    return (
      <EmptyState
        title="Chưa có cuộc trò chuyện"
        message="Kết nối với một Photographer để bắt đầu nhắn tin."
      />
    );
  return (
    <AppScreen>
      <Text accessibilityRole="header" style={styles.title}>
        Tin nhắn
      </Text>
      <View style={styles.list}>
        {items.map((conversation) => (
          <Pressable
            key={conversation.id}
            accessibilityRole="button"
            accessibilityLabel={`Mở cuộc trò chuyện ${conversation.id}`}
            onPress={() =>
              router.push({
                pathname: '/(details)/conversation/[id]',
                params: { id: conversation.id },
              })
            }
            style={styles.card}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>✉</Text>
            </View>
            <View style={styles.copy}>
              <Text style={styles.name}>Cuộc trò chuyện</Text>
              <Text style={styles.meta}>
                {conversation.lastMessageAt
                  ? `Cập nhật ${new Date(conversation.lastMessageAt).toLocaleString('vi-VN')}`
                  : 'Chưa có tin nhắn'}
              </Text>
              <Text style={styles.status}>
                {conversation.status === 'ACTIVE'
                  ? 'Đang hoạt động'
                  : 'Đã đóng'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>
      {conversations.hasNextPage ? (
        <Button
          label="Xem thêm"
          variant="secondary"
          loading={conversations.isFetchingNextPage}
          onPress={() => void conversations.fetchNextPage()}
        />
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 26,
  },
  list: { gap: spacing.md },
  card: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.light.surface,
    ...elevation.card,
  },
  avatar: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: colors.light.infoContainer,
  },
  avatarText: { color: colors.brand, fontSize: 24 },
  copy: { flex: 1, gap: spacing.xs },
  name: {
    color: colors.light.text,
    fontFamily: typography.semibold,
    fontSize: 16,
  },
  meta: { color: colors.light.muted, fontSize: 13 },
  status: { color: colors.brand, fontSize: 12 },
  chevron: { color: colors.light.muted, fontSize: 28 },
});
