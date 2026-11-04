import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * APP_VARIANT=development → «GF Dev», con su propio identificador, para poder
 * tener instaladas a la vez la versión de desarrollo y la definitiva.
 */
const IS_DEV = process.env.APP_VARIANT === 'development';

/**
 * Plan B: GF_HEALTHKIT=off compila sin el permiso de HealthKit, por si
 * Sideloadly lo rechaza con un Apple ID gratuito. La app usa entonces el
 * podómetro del iPhone.
 */
const HEALTHKIT = process.env.GF_HEALTHKIT !== 'off';

const BG = '#0B0B0C';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? 'GF Dev' : 'Guillem Fitness',
  slug: 'guillem-fitness',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'guillemfitness',
  userInterfaceStyle: 'dark',
  backgroundColor: BG,
  ios: {
    bundleIdentifier: IS_DEV ? 'com.guillem.fitness.dev' : 'com.guillem.fitness',
    supportsTablet: false,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      CFBundleDevelopmentRegion: 'es',
      CFBundleAllowMixedLocalizations: true,
    },
  },
  android: {
    package: IS_DEV ? 'com.guillem.fitness.dev' : 'com.guillem.fitness',
    adaptiveIcon: {
      backgroundColor: BG,
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: ['android.permission.ACTIVITY_RECOGNITION', 'android.permission.health.READ_STEPS'],
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    // Sin Face ID: las claves se guardan en el llavero, sin biometría.
    ['expo-secure-store', { faceIDPermission: false }],
    'expo-sharing',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 160,
        backgroundColor: BG,
      },
    ],
    [
      'expo-build-properties',
      {
        android: { minSdkVersion: 26 },
      },
    ],
    [
      // Solo notificaciones locales (fin de descanso). Sin push: el Apple ID
      // gratuito no admite el permiso de push y no lo necesitamos.
      'expo-notifications',
      { enableRemoteNotifications: false },
    ],
    [
      'expo-sensors',
      {
        motionPermission:
          'Guillem Fitness usa el podómetro del iPhone para contar tus pasos cuando no hay acceso a Salud.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Guillem Fitness necesita tus fotos para estimar las calorías de lo que comes.',
        cameraPermission:
          'Guillem Fitness usa la cámara para fotografiar tu comida y estimar sus calorías.',
        microphonePermission: false,
      },
    ],
    ...(HEALTHKIT
      ? ([
          [
            '@kingstinct/react-native-healthkit',
            {
              NSHealthShareUsageDescription:
                'Guillem Fitness lee tus pasos de Salud para mostrar tu progreso diario y tu calendario.',
              NSHealthUpdateUsageDescription: false,
              // Sin entrega en segundo plano: no hace falta y el Apple ID gratuito
              // podría no admitir el permiso.
              background: false,
            },
          ],
        ] satisfies NonNullable<ExpoConfig['plugins']>)
      : []),
    'react-native-health-connect',
  ],
  experiments: {
    typedRoutes: true,
  },
});
