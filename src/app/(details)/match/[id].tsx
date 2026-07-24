import { useLocalSearchParams } from 'expo-router';

import { DetailScreen } from '@/features/navigation/detail-screen';

export default function MatchDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DetailScreen entity="Kết nối" id={id} />;
}
