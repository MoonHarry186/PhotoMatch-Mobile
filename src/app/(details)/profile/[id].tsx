import { useLocalSearchParams } from 'expo-router';

import { DetailScreen } from '@/features/navigation/detail-screen';

export default function ProfileDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DetailScreen entity="Hồ sơ" id={id} />;
}
