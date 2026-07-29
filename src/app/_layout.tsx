import 'react-native-gesture-handler';
import '../global.css';

import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';

import { AppProvider } from '@/providers/app-provider';
import { RouteErrorBoundary } from '@/components/boundaries/FeatureErrorBoundary';
import { initializeObservability } from '@/services/observability';

void SplashScreen.preventAutoHideAsync();
WebBrowser.maybeCompleteAuthSession();
initializeObservability();

export { RouteErrorBoundary as ErrorBoundary };

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AppProvider>
  );
}
