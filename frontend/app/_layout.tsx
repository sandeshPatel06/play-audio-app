import { setAudioModeAsync } from 'expo-audio';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { BackHandler, View, ActivityIndicator, StyleSheet, LogBox } from 'react-native';
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
  background: '#070B14',
  text: '#EEF4FF',
};

function LoadingView() {
  console.log('[Layout] Rendering LoadingView');
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#14B8A6" />
    </View>
  );
}

function RootLayoutContent() {
  const { colors, resolvedTheme, isReady } = useTheme();
  const router = useRouter();

  // 1. Audio setup - non-blocking
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      shouldRouteThroughEarpiece: false,
    }).catch(e => console.warn('[Layout] Audio setup error:', e));
  }, []);

  // Always render SOMETHING to the system, but gate the stack on theme readiness
  if (!isReady) {
    return <LoadingView />;
  }

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
    backgroundColor: '#070B14',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#070B14',
  },
});
