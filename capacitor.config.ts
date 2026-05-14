import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.howzat.counter',
  appName: 'Howzat - Counter',
  webDir: 'dist/howzat-counter/browser',
  server: {
    androidScheme: 'https'
  },
  ios: {
    contentInset: 'never'
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
