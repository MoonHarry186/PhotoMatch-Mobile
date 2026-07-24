import Constants from 'expo-constants';
import { z } from 'zod';

const publicEnvironmentSchema = z.object({
  EXPO_PUBLIC_APP_ENV: z
    .enum(['development', 'preview', 'staging', 'production'])
    .default('development'),
  EXPO_PUBLIC_API_URL: z.url().default('http://localhost:53000'),
  EXPO_PUBLIC_WS_URL: z.url().default('http://localhost:53000'),
  EXPO_PUBLIC_APP_LINK_HOST: z.string().min(1).default('dev-app.photomatch.vn'),
  EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY: z.string().optional(),
  EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY: z.string().optional(),
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: z.string().optional(),
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: z.string().optional(),
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: z.string().optional(),
  EXPO_PUBLIC_SENTRY_DSN: z.url().optional(),
  EXPO_PUBLIC_ANALYTICS_PROVIDER: z.literal('disabled').default('disabled'),
});

const source = {
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_WS_URL: process.env.EXPO_PUBLIC_WS_URL,
  EXPO_PUBLIC_APP_LINK_HOST:
    process.env.EXPO_PUBLIC_APP_LINK_HOST ??
    (Constants.expoConfig?.extra?.associatedDomain as string | undefined),
  EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY:
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY,
  EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY:
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY,
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID:
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID:
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN || undefined,
  EXPO_PUBLIC_ANALYTICS_PROVIDER: process.env.EXPO_PUBLIC_ANALYTICS_PROVIDER,
};

export const env = publicEnvironmentSchema.parse(source);
export type AppEnvironment = z.infer<
  typeof publicEnvironmentSchema
>['EXPO_PUBLIC_APP_ENV'];
