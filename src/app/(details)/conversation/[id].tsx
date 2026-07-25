import { useLocalSearchParams } from 'expo-router';

import { FeatureErrorBoundary } from '@/components/boundaries/FeatureErrorBoundary';
import { DetailScreen } from '@/features/navigation/detail-screen';

export default function ConversationDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <FeatureErrorBoundary feature="chat">
      <DetailScreen entity="Cuộc trò chuyện" id={id} />
    </FeatureErrorBoundary>
  );
}
