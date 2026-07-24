import * as SecureStore from 'expo-secure-store';

import type { AppEnvironment } from '@/config/env';

const keyFor = (environment: AppEnvironment, accountId: string) =>
  `photomatch.${environment}.${accountId}.refresh-token`;
const activeAccountKey = (environment: AppEnvironment) =>
  `photomatch.${environment}.active-account`;

export const authStorage = {
  async readActive(environment: AppEnvironment) {
    const accountId = await SecureStore.getItemAsync(
      activeAccountKey(environment),
    );
    if (!accountId) return null;
    const refreshToken = await SecureStore.getItemAsync(
      keyFor(environment, accountId),
    );
    return refreshToken ? { accountId, refreshToken } : null;
  },
  async write(
    environment: AppEnvironment,
    accountId: string,
    refreshToken: string,
  ) {
    await SecureStore.setItemAsync(
      keyFor(environment, accountId),
      refreshToken,
      {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      },
    );
    await SecureStore.setItemAsync(activeAccountKey(environment), accountId, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
  async clear(environment: AppEnvironment, accountId?: string) {
    const resolvedAccount =
      accountId ??
      (await SecureStore.getItemAsync(activeAccountKey(environment)));
    if (resolvedAccount)
      await SecureStore.deleteItemAsync(keyFor(environment, resolvedAccount));
    await SecureStore.deleteItemAsync(activeAccountKey(environment));
  },
};
