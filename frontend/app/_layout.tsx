import { setAudioModeAsync } from 'expo-audio';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { BackHandler, StyleSheet, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

function RootLayoutContent() {
  const { colors, resolvedTheme, isReady } = useTheme();
  const router = useRouter();

  // Handle splash screen - fail-safe pattern
  useEffect(() => {
    // Prevent auto-hide on mount
    const preventHide = async () => {
      try {
        await SplashScreen.preventAutoHideAsync();
      } catch {}
    };
    preventHide();

    // Force hide splash after 3 seconds max (guaranteed fallback)
    const forceHideTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 3000);

    // Hide when ready
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {});
    }

    return () => clearTimeout(forceHideTimer);
  }, [isReady]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      shouldRouteThroughEarpiece: false,
    }).catch(err => console.error("Error setting audio mode:", err));
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [router]);

  return (
    <>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
          gestureEnabled: true,
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
});
