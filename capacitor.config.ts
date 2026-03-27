import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Unique ID for Play Store / App Store — reverse domain format
  appId: 'co.in.vardhanhospital.nexacare',
  appName: 'NexaCare Pro',
  webDir: 'dist',

  // When running in native app, the React build is served from the device itself.
  // API calls go to the hospital server — URL configured in app Settings.
  server: {
    // Allow the app to make cleartext (HTTP) requests to the hospital LAN server.
    // Remove this once you add HTTPS to the hospital server.
    cleartext: true,
    // androidScheme: 'https',  // uncomment + add HTTPS to server before App Store submission
  },

  android: {
    // Allow HTTP (cleartext) traffic to local hospital IP — needed until server gets HTTPS
    allowMixedContent: true,
    // Splash screen background matches app theme
    backgroundColor: '#2563eb',
  },

  ios: {
    // iOS App Store requires HTTPS — add SSL cert to hospital server first
    // contentInset: 'automatic',
  },

  plugins: {
    Preferences: {
      // Persists server URL between sessions
      group: 'NexaCarePrefs'
    }
  }
};

export default config;
