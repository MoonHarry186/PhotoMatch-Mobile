import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { pushPayloadSchema } from '@/schemas/runtime-contracts';

export function NotificationProvider({ children }: React.PropsWithChildren) {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        pushPayloadSchema.safeParse(response.notification.request.content.data);
      },
    );
    return () => subscription.remove();
  }, []);
  return children;
}
