import * as Sentry from '@sentry/react-native';

import { env } from '@/config/env';
import { sanitizeErrorContext } from '@/core/errors';

export function initializeObservability() {
  if (!env.EXPO_PUBLIC_SENTRY_DSN) return;
  Sentry.init({
    dsn: env.EXPO_PUBLIC_SENTRY_DSN,
    environment: env.EXPO_PUBLIC_APP_ENV,
    sendDefaultPii: false,
    enableAutoSessionTracking: true,
    beforeSend: (event) => sanitizeErrorContext(event) as typeof event,
  });
}

type AnalyticsEvent =
  | { name: 'app_open'; properties?: { source: 'icon' | 'link' | 'push' } }
  | {
      name: 'auth_result';
      properties: {
        method: 'email' | 'google' | 'apple';
        outcome: 'success' | 'cancel' | 'failure';
      };
    };

export const analytics = {
  track: (_event: AnalyticsEvent) => {
    // Deliberately disabled for MVP. The type is the privacy allow-list.
  },
};
