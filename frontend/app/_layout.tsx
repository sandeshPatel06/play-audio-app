import { setAudioModeAsync } from 'expo-audio';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { BackHandler, View, ActivityIndicator, StyleSheet, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

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
  const [appIsReady, setAppIsReady] = useState(false);

  // 1. Initial Readiness & Hub for hiding splash
  useEffect(() => {
    async function prepare() {
      console.log('[Layout] Preparing app...');
      try {
        // Pre-load anything if needed
      } catch (e) {
        console.warn('[Layout] Preparation error:', e);
      } finally {
        console.log('[Layout] Preparation complete');
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  // 2. Splash screen logic - hide only when BOTH theme and app are ready
  useEffect(() => {
    const readyToHide = isReady && appIsReady;
    console.log('[Layout] Status - isReady:', isReady, 'appIsReady:', appIsReady, 'readyToHide:', readyToHide);
    
    let timeoutId: NodeJS.Timeout;

    const hideSplash = async () => {
      console.log('[Layout] Attempting to hide splash screen...');
      try {
        await SplashScreen.hideAsync();
        console.log('[Layout] Splash screen hidden');
      } catch (e) {
        console.warn('[Layout] Splash screen hide failed or already hidden:', e);
      }
    };

    if (readyToHide) {
      hideSplash();
    } else {
      // Bulletproof timeout: hide after 2 seconds regardless
      timeoutId = setTimeout(() => {
        console.log('[Layout] Safety timeout: forcing splash hide');
        hideSplash();
      }, 2000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isReady, appIsReady]);

  // 3. Audio setup - non-blocking
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      shouldRouteThroughEarpiece: false,
    }).catch(e => console.warn('[Layout] Audio setup error:', e));
  }, []);

  // 4. Back handler
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

  // Always render SOMETHING to the system, but gate the stack on theme readiness
  // This prevents the system from seeing a "black" screen if the JS has started but theme hasn't
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
