import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vidyalayam.school',
  appName: 'Vidyalayam',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      'ais-pre-zfvtkxwqh2zdkbq5lhk34q-908899511909.asia-southeast1.run.app',
      'ais-dev-zfvtkxwqh2zdkbq5lhk34q-908899511909.asia-southeast1.run.app',
      '*.run.app',
      '*.googleapis.com',
      '*.firebaseio.com',
    ],
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: 'DEFAULT',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#B05C38',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
