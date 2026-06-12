import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  NotoSerif_400Regular,
  NotoSerif_700Bold,
  NotoSerif_700Bold_Italic,
} from '@expo-google-fonts/noto-serif';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';

import { initializeDatabase } from './src/database/db';
import { runSeedIfNeeded } from './src/services/seedService';
import { initializeIAP } from './src/services/iapService';
import AppNavigator from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ThemeProvider } from './src/ThemeContext';
import { useSettingsStore } from './src/store/settingsStore';
import { Colors } from './src/theme';

function ThemedStatusBar() {
  const darkMode = useSettingsStore(s => s.darkMode);
  return <StatusBar style={darkMode ? 'light' : 'dark'} />;
}

type BootState = 'loading' | 'ready' | 'error';

export default function App() {
  const [bootState, setBootState] = useState<BootState>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const [fontsLoaded] = useFonts({
    NotoSerif_400Regular,
    NotoSerif_700Bold,
    NotoSerif_700Bold_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    async function boot() {
      try {
        await initializeDatabase();
        await runSeedIfNeeded();
        // IAP init is best-effort — a store connection failure must not block startup.
        initializeIAP().catch(() => {});
        setBootState('ready');
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : String(e));
        setBootState('error');
      }
    }
    boot();
  }, []);

  // Block render until both DB boot and font load are done.
  if (bootState === 'loading' || !fontsLoaded) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={Colors.gold} />
        <Text style={styles.splashText}>LexiGreek</Text>
        <StatusBar style="light" />
      </View>
    );
  }

  if (bootState === 'error') {
    return (
      <View style={styles.splash}>
        <Text style={styles.errorTitle}>Startup failed</Text>
        <Text style={styles.errorDetail}>{errorMsg}</Text>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AppNavigator />
        <ThemedStatusBar />
      </ErrorBoundary>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  splashText: {
    color: Colors.gold,
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 1,
  },
  errorTitle: {
    color: Colors.error,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorDetail: {
    color: Colors.textPrimary,
    fontSize: 13,
    paddingHorizontal: 24,
    textAlign: 'center',
  },
});
