import { Stack } from 'expo-router';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/boundaries/FeatureErrorBoundary';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    />
  );
}
