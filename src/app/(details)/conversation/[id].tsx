import { useLocalSearchParams } from 'expo-router';

import { DetailScreen } from '@/features/navigation/detail-screen';

export default function ConversationDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DetailScreen entity="Cuộc trò chuyện" id={id} />;
}
