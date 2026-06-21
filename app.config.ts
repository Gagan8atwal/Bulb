import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'AL Command',
  slug: 'al-command',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'alcommand',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0A0A0B',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.alsolutions.alcommand',
    // Required for Sign in with Apple
    usesAppleSignIn: true,
    infoPlist: {
      // Face ID
      NSFaceIDUsageDescription:
        'AL Command uses Face ID to keep your data secure.',
      // Voice capture
      NSSpeechRecognitionUsageDescription:
        'AL Command uses on-device speech recognition to capture tasks by voice.',
      NSMicrophoneUsageDescription:
        'AL Command uses the microphone to record your voice when capturing tasks.',
      // Minimum iOS deployment for WKWebsiteDataStore(forIdentifier:) — used in browser module (Sprint 4)
      UIRequiresFullScreen: false,
    },
  },
  android: {
    // Sprint 1 is iOS-only; Android can be added later
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0A0A0B',
    },
    package: 'com.alsolutions.alcommand',
    permissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.INTERNET',
    ],
  },
  plugins: [
    'expo-router',
    'expo-apple-authentication',
    'expo-local-authentication',
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: '17.0',
          useFrameworks: 'static',
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/icon.png',
  },
  extra: {
    eas: {
      // Replace with your EAS project ID after running `eas init`
      projectId: 'REPLACE_WITH_YOUR_EAS_PROJECT_ID',
    },
  },
});
