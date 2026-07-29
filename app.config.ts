import type { ConfigContext, ExpoConfig } from 'expo/config';

type AppVariant = 'development' | 'preview' | 'staging' | 'production';

const variants: Record<
  AppVariant,
  {
    name: string;
    bundleIdentifier: string;
    packageName: string;
    scheme: string;
    associatedDomain: string;
  }
> = {
  development: {
    name: 'PhotoMatch Dev',
    bundleIdentifier: 'vn.photomatch.mobile.dev',
    packageName: 'vn.photomatch.mobile.dev',
    scheme: 'photomatch-dev',
    associatedDomain: 'dev-app.photomatch.vn',
  },
  preview: {
    name: 'PhotoMatch Preview',
    bundleIdentifier: 'vn.photomatch.mobile.preview',
    packageName: 'vn.photomatch.mobile.preview',
    scheme: 'photomatch-preview',
    associatedDomain: 'preview-app.photomatch.vn',
  },
  staging: {
    name: 'PhotoMatch Staging',
    bundleIdentifier: 'vn.photomatch.mobile.staging',
    packageName: 'vn.photomatch.mobile.staging',
    scheme: 'photomatch-staging',
    associatedDomain: 'staging-app.photomatch.vn',
  },
  production: {
    name: 'PhotoMatch',
    bundleIdentifier: 'vn.photomatch.mobile',
    packageName: 'vn.photomatch.mobile',
    scheme: 'photomatch',
    associatedDomain: 'app.photomatch.vn',
  },
};

function resolveVariant(): AppVariant {
  const value = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
  if (value in variants) return value as AppVariant;
  throw new Error(`Unsupported EXPO_PUBLIC_APP_ENV: ${value}`);
}

function googleIosUrlScheme(clientId: string): string {
  const suffix = '.apps.googleusercontent.com';
  if (!clientId.endsWith(suffix)) {
    throw new Error(
      'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID must be an iOS OAuth client ID',
    );
  }
  return `com.googleusercontent.apps.${clientId.slice(0, -suffix.length)}`;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant();
  const target = variants[variant];
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const plugins: NonNullable<ExpoConfig['plugins']> = [
    'expo-router',
    'expo-secure-store',
    'expo-localization',
    'expo-apple-authentication',
    '@react-native-community/datetimepicker',
    [
      'expo-image-picker',
      {
        photosPermission:
          'PhotoMatch truy cập ảnh để bạn cập nhật hồ sơ và chia sẻ nội dung đã chọn.',
        cameraPermission:
          'PhotoMatch truy cập camera để bạn chụp ảnh hồ sơ hoặc nội dung muốn chia sẻ.',
        microphonePermission: false,
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'PhotoMatch dùng vị trí khi bạn yêu cầu để tìm người phù hợp ở gần. Vị trí chính xác không hiển thị công khai.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/images/android-icon-monochrome.png',
        color: '#2563EB',
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FFFFFF',
        image: './assets/images/splash-logo.png',
        imageWidth: 160,
        dark: {
          backgroundColor: '#FFFFFF',
          image: './assets/images/splash-logo.png',
        },
      },
    ],
  ];
  if (googleIosClientId) {
    plugins.push([
      '@react-native-google-signin/google-signin',
      { iosUrlScheme: googleIosUrlScheme(googleIosClientId) },
    ]);
  }

  return {
    ...config,
    name: target.name,
    slug: 'photomatch-mobile',
    owner: process.env.EXPO_OWNER,
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: target.scheme,
    userInterfaceStyle: 'automatic',
    runtimeVersion: { policy: 'appVersion' },
    ios: {
      bundleIdentifier: target.bundleIdentifier,
      supportsTablet: false,
      usesAppleSignIn: true,
      associatedDomains: [`applinks:${target.associatedDomain}`],
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY,
      },
      icon: './assets/images/icon.png',
      infoPlist: {
        CFBundleAllowMixedLocalizations: true,
      },
    },
    android: {
      package: target.packageName,
      adaptiveIcon: {
        backgroundColor: '#2563EB',
        foregroundImage: './assets/images/adaptive-icon.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: variant === 'production',
          data: [
            { scheme: 'https', host: target.associatedDomain, pathPrefix: '/' },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY,
        },
      },
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins,
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      appEnv: variant,
      associatedDomain: target.associatedDomain,
      eas: {
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
      },
    },
  };
};
