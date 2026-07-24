import { useRouter } from 'expo-router';
import { Text } from 'react-native';

import { ErrorState } from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui';
import { idRouteParamsSchema } from '@/schemas/route-params';

export function DetailScreen({
  entity,
  id,
}: {
  entity: string;
  id: string | string[] | undefined;
}) {
  const router = useRouter();
  const parsed = idRouteParamsSchema.safeParse({
    id: Array.isArray(id) ? id[0] : id,
  });
  if (!parsed.success) {
    return (
      <ErrorState
        title="Liên kết không hợp lệ"
        message="Mã nội dung không đúng định dạng."
        actionLabel="Quay lại"
        onAction={() => router.back()}
      />
    );
  }
  return (
    <AppScreen>
      <Text accessibilityRole="header">{entity}</Text>
      <Text selectable>{parsed.data.id}</Text>
      <Text>
        Nội dung sẽ được tải từ endpoint được phân quyền khi feature tương ứng
        được mở.
      </Text>
      <Button
        label="Quay lại"
        variant="secondary"
        onPress={() => router.back()}
      />
    </AppScreen>
  );
}
