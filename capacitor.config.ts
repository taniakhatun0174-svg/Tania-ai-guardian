import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tania.aiguardian',
  appName: 'TANIA AI GUARDIAN',
  webDir: 'dist',
  server: { url: 'https://tania-ai-guardian.onrender.com', cleartext: false }
};

export default config;
