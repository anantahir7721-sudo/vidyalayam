import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vidyalayam.school',
  appName: 'Vidyalayam',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
