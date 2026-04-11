import 'react-native-reanimated';
import { setAudioModeAsync } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import AppQueryProvider from '../components/AppQueryProvider';
import AudioRuntime from '../components/AudioRuntime';
import GlobalMiniPlayer from '../components/GlobalMiniPlayer';
import { CORE_COLORS } from '../constants/colors';
import { GlassSurface, PageShell } from '../components/ui/primitives';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet, LogBox, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { useAdaptiveTheme } from '../hooks/useAdaptiveTheme';
import { enableScreens } from 'react-native-screens';

// Disable native screens support to prevent splash screen conflicts
try {
  enableScreens(false);
} catch {
  // Ignore screen toggling issues in runtimes that manage this internally.
}

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

// Default dark colors for loading state
const LOADING_COLORS = {
  background: CORE_COLORS.darkBG,
  text: CORE_COLORS.darkText,
};

function LoadingView() {
  const theme = useAdaptiveTheme();

  return (
    <PageShell style={styles.loading}>
      <View style={styles.loadingAccentRing} />
      <View style={styles.loadingContent}>
        <GlassSurface
          variant="glassStrong"
          style={styles.loadingCard}
          contentStyle={{
            alignItems: 'center',
            paddingHorizontal: theme.spacing.xl,
            paddingVertical: theme.spacing.xxl,
          }}
        >
          <View style={[styles.loadingIconWrap, { backgroundColor: theme.colors.accentSurface }]}>
            <Ionicons name="musical-notes" size={48} color={theme.accent} />
          </View>
          <Text style={[styles.loadingTitle, { color: theme.colors.text }]}>Play-Veee</Text>
          <Text style={[styles.loadingSubtitle, { color: theme.colors.textMuted }]}>Preparing your sonic experience...</Text>
          <ActivityIndicator size="small" color={theme.accent} style={styles.loadingIndicator} />
        </GlassSurface>
      </View>
    </PageShell>
  );
}

function RootLayoutContent() {
  const { colors, resolvedTheme, isReady } = useTheme();

  // 1. Audio setup - non-blocking
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      shouldRouteThroughEarpiece: false,
    }).catch(() => {
      // Audio mode setup is best-effort on app boot.
    });
  }, []);

  const stackScreenOptions = useMemo(() => ({
    headerStyle: {
      backgroundColor: colors?.background || LOADING_COLORS.background,
    },
    headerTintColor: colors?.text || LOADING_COLORS.text,
    headerShadowVisible: false,
    contentStyle: {
      backgroundColor: colors?.background || LOADING_COLORS.background,
    },
    animation: 'fade' as const,
    gestureEnabled: true,
    gestureDirection: 'horizontal' as const,
  }), [colors?.background, colors?.text]);

  return (
    <>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <AudioRuntime />
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="player" 
          options={{ 
            presentation: 'modal', 
            headerShown: false,
            gestureEnabled: true,
          }} 
        />
        <Stack.Screen 
          name="video_player" 
          options={{ 
            presentation: 'fullScreenModal', 
            headerShown: false,
            gestureEnabled: true,
          }} 
        />
        <Stack.Screen name="playlist/[id]" options={{ headerShown: false }} />
      </Stack>
      <GlobalMiniPlayer />
      {!isReady && <LoadingView />}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <AppQueryProvider>
          <ThemeProvider>
            <RootLayoutContent />
          </ThemeProvider>
        </AppQueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CORE_COLORS.black,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CORE_COLORS.darkBG,
  },
  loadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 360,
  },
  loadingIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  loadingAccentRing: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(20,184,166,0.06)',
  },
  loadingImage: {
    width: 140,
    height: 140,
    marginBottom: 4,
  },
  loadingTitle: {
    fontSize: 30,
    fontWeight: '900',
    marginTop: 4,
  },
  loadingIndicator: {
    marginTop: 24,
  },
  loadingSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
});
