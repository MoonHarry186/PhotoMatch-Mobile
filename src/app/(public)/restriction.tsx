import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui';
import { useI18n } from '@/i18n/i18n-provider';
import { useSession } from '@/providers/session-provider';
import { useTheme } from '@/providers/theme-provider';
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
  const { t, locale } = useI18n();
  const theme = useTheme();
  const palette = theme.resolved === 'dark' ? colors.dark : colors.light;
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
  const reasonSuffix = reason ? ` do ${reason}` : '';
  const statusCopy = permanent
    ? t('restriction.permanentStatus', { reason: reasonSuffix })
    : temporary
      ? t('restriction.temporaryStatus', { reason: reasonSuffix })
      : t('restriction.limitedStatus', { reason: reasonSuffix });
  const message = t('restriction.message', { status: statusCopy });

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
      <View
        style={[styles.badge, { backgroundColor: palette.warningContainer }]}
      >
        <Text style={[styles.badgeText, { color: palette.warning }]}>
          {permanent ? '!' : '⏱'}
        </Text>
      </View>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: palette.text }]}
      >
        {t('restriction.title')}
      </Text>
      <Text style={[styles.description, { color: palette.muted }]}>
        {message}
      </Text>
      {endsAt ? (
        <View style={[styles.detail, { backgroundColor: palette.surface }]}>
          <Text style={[styles.detailLabel, { color: palette.muted }]}>
            {t('restriction.reopensAt')}
          </Text>
          <Text style={[styles.detailValue, { color: palette.text }]}>
            {endsAt.toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN')}
          </Text>
        </View>
      ) : null}
      <Button
        label={
          session.snapshot
            ? t('restriction.signOut')
            : t('restriction.returnToSignIn')
        }
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
  },
  badgeText: {
    fontFamily: typography.bold,
    fontSize: 28,
  },
  title: {
    fontFamily: typography.bold,
    fontSize: 24,
    textAlign: 'center',
  },
  description: {
    fontFamily: typography.regular,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  detail: {
    padding: spacing.lg,
    gap: spacing.xs,
    borderRadius: radius.md,
  },
  detailLabel: {
    fontFamily: typography.medium,
  },
  detailValue: {
    fontFamily: typography.semibold,
  },
});
