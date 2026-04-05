import { setAudioModeAsync } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { CORE_COLORS } from '../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, LogBox, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { enableScreens } from 'react-native-screens';

// Disable native screens support to prevent splash screen conflicts
try {
  enableScreens(false);
} catch (e) {
  console.warn('[Layout] Failed to disable screens:', e);
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
  console.log('[Layout] Rendering LoadingView');
  return (
    <View style={styles.loading}>
      <View style={styles.loadingContent}>
        <Ionicons name="musical-notes" size={80} color={CORE_COLORS.tealAccent} style={{ marginBottom: 20 }} />
        <Text style={styles.loadingTitle}>Just Play</Text>
        <ActivityIndicator size="small" color={CORE_COLORS.tealAccent} style={styles.loadingIndicator} />
        <Text style={styles.loadingSubtitle}>Preparing your sonic experience...</Text>
      </View>
    </View>
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
      

    }).catch(e => console.warn('[Layout] Audio setup error:', e));
  }, []);

  return (
    <>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors?.background || LOADING_COLORS.background,
          },
          headerTintColor: colors?.text || LOADING_COLORS.text,
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors?.background || LOADING_COLORS.background,
          },
          animation: 'fade',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      >
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
      {!isReady && <LoadingView />}
    </>
  );
}

export default function RootLayout() {
  console.log('[Layout] RootLayout rendering');
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootLayoutContent />
        </ThemeProvider>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingImage: {
    width: 140,
    height: 140,
    marginBottom: 4,
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: CORE_COLORS.darkText,
    marginTop: 16,
  },
  loadingIndicator: {
    marginTop: 24,
  },
  loadingSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: CORE_COLORS.switchTrackOff,
    marginTop: 8,
  },
});
