import { SymbolView } from 'expo-symbols';
import { Redirect, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, type ColorValue } from 'react-native';

import { useI18n } from '@/i18n/i18n-provider';
import { useSession } from '@/providers/session-provider';
import { useOptionalTheme } from '@/providers/theme-provider';
import { colors } from '@/theme';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/boundaries/FeatureErrorBoundary';

export default function TabsLayout() {
  const { t } = useI18n();
  const session = useSession();
  const theme = useOptionalTheme();
  if (session.gate !== 'app') return <Redirect href="/" />;
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  const currentRole = session.snapshot?.user.roles.find(
    (role) => role.id === session.snapshot?.user.currentRoleId,
  )?.code;
  const featureRestrictions = session.snapshot?.restrictions.filter(
    (item) =>
      item.status === 'ACTIVE' && item.penaltyType === 'FEATURE_RESTRICTION',
  ).length;
  return (
    <Tabs
      screenOptions={({ route }) => {
        const isDiscovery = route.name === 'discovery';

        return {
          headerShown: false,
          tabBarActiveTintColor: isDiscovery ? colors.onBrand : palette.text,
          tabBarInactiveTintColor: isDiscovery
            ? colors.discovery.whiteTextSubtle
            : palette.muted,
          tabBarStyle: [
            styles.tabBar,
            {
              backgroundColor: isDiscovery
                ? colors.dark.background
                : palette.surface,
            },
          ],
          tabBarItemStyle: styles.tabBarItem,
          tabBarIconStyle: styles.tabBarIcon,
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarBadgeStyle: styles.tabBarBadge,
        };
      }}
    >
      <Tabs.Screen
        name="discovery"
        options={{
          title:
            currentRole === 'PHOTOGRAPHER'
              ? t('discovery.tab.interests')
              : t('tabs.discovery'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              focused={focused}
              name={{ ios: 'safari', android: 'explore', web: 'explore' }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('tabs.messages'),
          tabBarBadge: featureRestrictions || undefined,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              focused={focused}
              name={{ ios: 'message.fill', android: 'forum', web: 'forum' }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              focused={focused}
              name={{
                ios: 'person.crop.circle.fill',
                android: 'account_circle',
                web: 'account_circle',
              }}
            />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  color,
  focused,
  name,
}: {
  color: ColorValue;
  focused: boolean;
  name: ComponentProps<typeof SymbolView>['name'];
}) {
  return (
    <SymbolView
      name={name}
      size={23}
      tintColor={color}
      style={[styles.icon, focused && styles.iconActive]}
    />
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 80,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: colors.dark.background,
    borderTopWidth: 0,
    borderTopColor: 'transparent',
    shadowColor: colors.discovery.shadow,
    shadowOpacity: 0,
    elevation: 0,
  },
  tabBarItem: {
    paddingVertical: 0,
  },
  tabBarIcon: {
    marginTop: 0,
  },
  tabBarLabel: {
    marginTop: 3,
    marginBottom: 0,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
  },
  tabBarBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.discovery.heart,
    color: colors.onBrand,
    fontSize: 10,
    lineHeight: 18,
  },
  icon: {
    opacity: 0.88,
  },
  iconActive: {
    opacity: 1,
  },
});
