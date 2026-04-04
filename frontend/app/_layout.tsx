import { setAudioModeAsync } from 'expo-audio';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { BackHandler, View, ActivityIndicator, StyleSheet, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

// Default dark colors for loading state
const LOADING_COLORS = {
  background: '#070B14',
  text: '#EEF4FF',
};

function LoadingView() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#14B8A6" />
    </View>
  );
}

function RootLayoutContent() {
  const { colors, resolvedTheme, isReady } = useTheme();
  const router = useRouter();
  const [splashHidden, setSplashHidden] = useState(false);

  // Handle splash screen - hide when ready or after safety timeout
  useEffect(() => {
    if (splashHidden) return;

    let timeoutId: NodeJS.Timeout;
    
    const hideSplash = async () => {
      try {
        await SplashScreen.hideAsync();
        setSplashHidden(true);
      } catch (e) {
        console.warn('Splash hide failed:', e);
        // Still mark as hidden to prevent infinite loops
        setSplashHidden(true);
      }
    };

    if (isReady) {
      hideSplash();
    } else {
      // Safety timeout: force hide after 3 seconds even if theme not ready
      timeoutId = setTimeout(hideSplash, 3000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isReady, splashHidden]);

  // Audio setup - delayed to not block UI
  useEffect(() => {
    const timer = setTimeout(() => {
      setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
        shouldRouteThroughEarpiece: false,
      }).catch(() => {});
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Back handler
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#070B14',
  },
});
