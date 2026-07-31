import { BookingList } from '@/features/bookings/booking-list';
import { useSession } from '@/providers/session-provider';

export default function BookingsRoute() {
  const user = useSession().snapshot?.user;
  if (!user?.currentRoleId) return null;
  return (
    <BookingList scope={{ userId: user.id, roleId: user.currentRoleId }} />
  );
}
