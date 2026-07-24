import { useLocalSearchParams } from 'expo-router';

import { DetailScreen } from '@/features/navigation/detail-screen';

export default function BookingDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DetailScreen entity="Lịch chụp" id={id} />;
}
