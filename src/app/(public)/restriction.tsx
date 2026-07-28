import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui';
import { useSession } from '@/providers/session-provider';
import { colors, radius, spacing, typography } from '@/theme';

function routeParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function validDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function RestrictionRoute() {
  const session = useSession();
  const router = useRouter();
  const params = useLocalSearchParams();
  const active = session.snapshot?.restrictions.find(
    (item) =>
      item.status === 'ACTIVE' &&
      (item.penaltyType === 'TEMPORARY_SUSPENSION' ||
        item.penaltyType === 'PERMANENT_BAN'),
  );
  const accountStatus =
    session.snapshot?.user.accountStatus ?? routeParam(params.accountStatus);
  const penaltyType = active?.penaltyType ?? routeParam(params.penaltyType);
  const reason = active?.reason ?? routeParam(params.reason);
  const endsAt = validDate(active?.endsAt ?? routeParam(params.endsAt));
  const permanent =
    accountStatus === 'BANNED' ||
    accountStatus === 'DELETED' ||
    penaltyType === 'PERMANENT_BAN';
  const temporary =
    accountStatus === 'SUSPENDED' || penaltyType === 'TEMPORARY_SUSPENSION';
  const statusCopy = permanent
    ? `Tài khoản của bạn đã bị ngưng hoạt động${reason ? ` do ${reason}` : ''}.`
    : temporary
      ? `Tài khoản của bạn hiện bị tạm ngưng${reason ? ` do ${reason}` : ''}.`
      : `Tài khoản của bạn đang bị hạn chế${reason ? ` do ${reason}` : ''}.`;
  const message = `Chúng tôi cam kết xây dựng một cộng đồng lành mạnh và thân thiện, không khoan nhượng với các hành vi vi phạm quy tắc cộng đồng. ${statusCopy} Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ bộ phận hỗ trợ.`;

  const leave = async () => {
    try {
      if (session.snapshot) await session.signOut();
    } finally {
      router.replace('/(auth)/sign-in');
    }
  };

  return (
    <AppScreen
      testID="restriction-screen"
      scrollProps={{
        testID: 'restriction-content',
        contentContainerStyle: styles.content,
      }}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{permanent ? '!' : '⏱'}</Text>
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        Nhắc nhở thân thiện
      </Text>
      <Text style={styles.description}>{message}</Text>
      {endsAt ? (
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Thời gian mở lại dự kiến</Text>
          <Text style={styles.detailValue}>
            {endsAt.toLocaleString('vi-VN')}
          </Text>
        </View>
      ) : null}
      <Button
        label={session.snapshot ? 'Đăng xuất' : 'Quay lại đăng nhập'}
        variant="secondary"
        onPress={() => void leave()}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  badge: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.warningContainer,
  },
  badgeText: {
    color: colors.light.warning,
    fontFamily: typography.bold,
    fontSize: 28,
  },
  title: {
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 24,
    textAlign: 'center',
  },
  description: {
    color: colors.light.muted,
    fontFamily: typography.regular,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  detail: {
    padding: spacing.lg,
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.light.surface,
  },
  detailLabel: {
    color: colors.light.muted,
    fontFamily: typography.medium,
  },
  detailValue: {
    color: colors.light.text,
    fontFamily: typography.semibold,
  },
});
