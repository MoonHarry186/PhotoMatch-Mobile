import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { ErrorState, LoadingState } from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui';
import { meControllerMe } from '@/generated/api/sdk.gen';
import { useAppSnackbar } from '@/hooks/use-app-snackbar';
import { useSession } from '@/providers/session-provider';
import { queryKeys } from '@/services/api/query-keys';
import { unwrap } from '@/services/api/result';

export default function ProfileRoute() {
  const session = useSession();
  const { showSnackbar } = useAppSnackbar();
  const userId = session.snapshot?.user.id ?? 'unknown';
  const roleId = session.snapshot?.user.currentRoleId;
  const { data, errorUpdatedAt, isError, isPending, isRefetchError, refetch } =
    useQuery({
      queryKey: queryKeys.me({ userId, roleId }),
      queryFn: () => meControllerMe().then(unwrap),
      initialData: session.snapshot?.user,
    });

  useEffect(() => {
    if (!isRefetchError) return;
    showSnackbar({
      message: 'Không thể cập nhật hồ sơ. Dữ liệu gần nhất vẫn được giữ.',
      actionLabel: 'Thử lại',
      onAction: () => void refetch(),
    });
  }, [errorUpdatedAt, isRefetchError, refetch, showSnackbar]);

  if (isPending) return <LoadingState label="Đang tải hồ sơ…" />;
  if (isError && !data) {
    return (
      <ErrorState
        title="Không thể tải hồ sơ"
        primaryActionLabel="Thử lại"
        onPrimaryAction={() => void refetch()}
      />
    );
  }
  return (
    <AppScreen>
      <Text accessibilityRole="header">Hồ sơ</Text>
      <Text>{data?.email}</Text>
      <Button
        label="Đăng xuất"
        variant="secondary"
        onPress={() => void session.signOut()}
      />
    </AppScreen>
  );
}
