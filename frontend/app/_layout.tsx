import { setAudioModeAsync } from 'expo-audio';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { BackHandler, View, ActivityIndicator, StyleSheet, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

// Ignore non-critical warnings in development
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#14B8A6" />
    </View>
  );
}

function RootLayoutContent() {
  const { colors, resolvedTheme, isReady } = useTheme();
  const router = useRouter();

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

  if (!isReady) {
    return (
      <>
        <StatusBar style="light" />
        <LoadingScreen />
      </>
    );
  }

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootLayoutContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#070B14',
  },
});
