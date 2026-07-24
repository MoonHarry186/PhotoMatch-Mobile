import { Text } from 'react-native';

import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui';
import { useSession } from '@/providers/session-provider';

export default function RestrictionRoute() {
  const session = useSession();
  const active = session.snapshot?.restrictions.find(
    (item) => item.status === 'ACTIVE',
  );
  return (
    <AppScreen>
      <Text accessibilityRole="header">Tài khoản đang bị hạn chế</Text>
      <Text>
        {active?.reason ?? 'Một hạn chế đang được áp dụng cho tài khoản.'}
      </Text>
      {active?.endsAt ? (
        <Text>Kết thúc: {new Date(active.endsAt).toLocaleString()}</Text>
      ) : null}
      <Button
        label="Đăng xuất"
        variant="secondary"
        onPress={() => void session.signOut()}
      />
    </AppScreen>
  );
}
