import { useLocalSearchParams } from 'expo-router';

import { ErrorState } from '@/components/feedback';
import { BookingCreateForm } from '@/features/bookings/booking-create-form';
import { useSession } from '@/providers/session-provider';

export default function BookingCreateRoute() {
  const params = useLocalSearchParams<{
    photographerRoleId?: string;
    serviceId?: string;
    conversationId?: string;
  }>();
  const user = useSession().snapshot?.user;
  if (!user?.currentRoleId || !params.photographerRoleId || !params.serviceId)
    return <ErrorState title="Thiếu thông tin đặt lịch" />;
  return (
    <BookingCreateForm
      photographerRoleId={params.photographerRoleId}
      customerRoleId={user.currentRoleId}
      serviceId={params.serviceId}
      conversationId={params.conversationId}
      scope={{ userId: user.id, roleId: user.currentRoleId }}
    />
  );
}
