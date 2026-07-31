import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useEffect, useRef } from 'react';

import {
  parsePushPayload,
  type PushPayload,
} from '@/schemas/runtime-contracts';
import {
  devicesControllerRegister,
  devicesControllerRemove,
} from '@/generated/api/sdk.gen';
import { unwrap } from '@/services/api/result';
import { getInstallationId } from '@/services/device-id';
import { useSession } from './session-provider';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/services/api/query-keys';
import { env } from '@/config/env';
import { useNavigationStore } from '@/stores/navigation.store';

export function NotificationProvider({ children }: React.PropsWithChildren) {
  const session = useSession();
  const client = useQueryClient();
  const registeredRef = useRef<{ deviceId: string; userId: string } | null>(
    null,
  );
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const payload = parsePushPayload(
          response.notification.request.content.data,
        );
        if (!payload || !session.snapshot?.user.id) return;
        const destination = destinationForPush(payload);
        if (!destination) return;
        useNavigationStore
          .getState()
          .queue(
            `${env.EXPO_PUBLIC_APP_ENV}:${session.snapshot.user.id}`,
            destination,
          );
      },
    );
    return () => subscription.remove();
  }, [session.snapshot?.user.id]);

  useEffect(() => {
    let cancelled = false;
    const userId = session.snapshot?.user.id;
    if (
      !userId ||
      session.gate !== 'app' ||
      Platform.OS === 'web' ||
      !Device.isDevice
    ) {
      const registered = registeredRef.current;
      registeredRef.current = null;
      if (registered)
        void devicesControllerRemove({
          path: { deviceId: registered.deviceId },
        });
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      const permission = await Notifications.getPermissionsAsync();
      const granted = permission.granted
        ? permission
        : permission.status === Notifications.PermissionStatus.UNDETERMINED
          ? await Notifications.requestPermissionsAsync()
          : permission;
      if (cancelled || !granted.granted) return;
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;
      if (!projectId) return;
      const token = (await Notifications.getExpoPushTokenAsync({ projectId }))
        .data;
      const deviceId = await getInstallationId();
      if (cancelled) return;
      await unwrap(
        await devicesControllerRegister({
          body: { deviceId, provider: 'EXPO', token },
        }),
      );
      registeredRef.current = { deviceId, userId };
      void client.invalidateQueries({ queryKey: queryKeys.me({ userId }) });
    })().catch(() => {
      // Notification permission/token failures must never block app bootstrap.
    });
    return () => {
      cancelled = true;
    };
  }, [client, session.gate, session.snapshot?.user.id]);
  return children;
}

function destinationForPush(payload: PushPayload) {
  if (payload.type === 'match')
    return { version: 1 as const, name: 'match' as const, id: payload.matchId };
  if (payload.type === 'booking')
    return {
      version: 1 as const,
      name: 'booking' as const,
      id: payload.bookingId,
    };
  return null;
}
