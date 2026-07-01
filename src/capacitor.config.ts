import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.coralhub.app',
  appName: 'CoralHub',
  webDir: 'dist',
  server: {
    url: 'https://coralhub.vercel.app',
    cleartext: false,
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com'],
    },
  },
};

export default config;
