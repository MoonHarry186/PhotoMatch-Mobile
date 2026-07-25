import { Redirect, Tabs } from 'expo-router';
import { Text as TabIconText, type ColorValue } from 'react-native';

import { useI18n } from '@/i18n/i18n-provider';
import { useSession } from '@/providers/session-provider';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/boundaries/FeatureErrorBoundary';

export default function TabsLayout() {
  const { t } = useI18n();
  const session = useSession();
  if (session.gate !== 'app') return <Redirect href="/" />;
  const currentRole = session.snapshot?.user.roles.find(
    (role) => role.id === session.snapshot?.user.currentRoleId,
  )?.code;
  const featureRestrictions = session.snapshot?.restrictions.filter(
    (item) =>
      item.status === 'ACTIVE' && item.penaltyType === 'FEATURE_RESTRICTION',
  ).length;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarLabelStyle: { fontFamily: 'PlusJakartaSans_600SemiBold' },
      }}
    >
      <Tabs.Screen
        name="discovery"
        options={{
          title:
            currentRole === 'PHOTOGRAPHER' ? 'Quan tâm' : t('tabs.discovery'),
          tabBarIcon: ({ color }) => <TabIcon color={color} label="◎" />,
        }}
      />
      <Tabs.Screen
        name="nearby"
        options={{
          title: t('tabs.nearby'),
          tabBarIcon: ({ color }) => <TabIcon color={color} label="⌖" />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('tabs.messages'),
          tabBarBadge: featureRestrictions || undefined,
          tabBarIcon: ({ color }) => <TabIcon color={color} label="✉" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color }) => <TabIcon color={color} label="○" />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ color, label }: { color: ColorValue; label: string }) {
  return <TabIconText style={{ color }}>{label}</TabIconText>;
}
