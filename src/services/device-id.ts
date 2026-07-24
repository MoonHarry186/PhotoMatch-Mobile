import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const KEY = 'photomatch.installation-id.v1';

export async function getInstallationId(): Promise<string> {
  const stored = await AsyncStorage.getItem(KEY);
  if (stored) return stored;
  const created = Crypto.randomUUID();
  await AsyncStorage.setItem(KEY, created);
  return created;
}
