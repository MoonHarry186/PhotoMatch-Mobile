import { useRouter } from 'expo-router';

import { ErrorState } from '@/components/feedback';

export default function NotFoundRoute() {
  const router = useRouter();
  return (
    <ErrorState
      title="Không tìm thấy nội dung"
      message="Liên kết không hợp lệ hoặc nội dung không còn khả dụng."
      actionLabel="Về trang chính"
      onAction={() => router.replace('/')}
    />
  );
}
