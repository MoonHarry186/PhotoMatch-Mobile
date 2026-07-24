import { Text } from 'react-native';

import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui';
import { useSession } from '@/providers/session-provider';

export default function ProfileRoute() {
  const session = useSession();
  return (
    <AppScreen>
      <Text accessibilityRole="header">Hồ sơ</Text>
      <Text>{session.snapshot?.user.email}</Text>
      <Button
        label="Đăng xuất"
        variant="secondary"
        onPress={() => void session.signOut()}
      />
    </AppScreen>
  );
}
