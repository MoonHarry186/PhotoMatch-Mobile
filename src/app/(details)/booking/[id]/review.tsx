import { useLocalSearchParams } from 'expo-router';

import { ErrorState } from '@/components/feedback';
import { BookingDetailScreen } from '@/features/bookings/booking-detail-screen';
import { useSession } from '@/providers/session-provider';
import { idRouteParamsSchema } from '@/schemas/route-params';

export default function BookingReviewRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const parsed = idRouteParamsSchema.safeParse({
    id: Array.isArray(id) ? id[0] : id,
  });
  const user = useSession().snapshot?.user;
  if (!parsed.success)
    return <ErrorState title="Liên kết đánh giá không hợp lệ" />;
  if (!user?.currentRoleId)
    return <ErrorState title="Chưa xác định được vai trò hiện tại" />;
  return (
    <BookingDetailScreen
      bookingId={parsed.data.id}
      scope={{ userId: user.id, roleId: user.currentRoleId }}
    />
  );
}
