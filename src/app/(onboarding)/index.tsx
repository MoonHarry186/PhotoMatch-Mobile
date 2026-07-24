import { Redirect } from 'expo-router';
import { Text } from 'react-native';

import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui';
import { useSession } from '@/providers/session-provider';

export default function OnboardingRoute() {
  const session = useSession();
  if (session.gate === 'signed-out') return <Redirect href="/(auth)/sign-in" />;
  if (session.gate === 'app') return <Redirect href="/(tabs)/discovery" />;
  const missing = session.snapshot?.onboarding.missing ?? [];
  return (
    <AppScreen>
      <Text accessibilityRole="header">Hoàn thiện hồ sơ</Text>
      <Text>PhotoMatch sẽ tiếp tục từ bước đầu tiên chưa hoàn thành.</Text>
      {missing.map((item) => (
        <Text key={item}>• {item}</Text>
      ))}
      <Button label="Tải lại tiến độ" onPress={() => void session.reload()} />
      <Button
        label="Đăng xuất"
        variant="ghost"
        onPress={() => void session.signOut()}
      />
    </AppScreen>
  );
}
