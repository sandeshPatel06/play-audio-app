import type { ExpoConfig } from 'expo/config';
const { getThemeColors, ACCENT_COLORS } = require('./constants/colors.config');

const darkColors = getThemeColors('dark', ACCENT_COLORS.teal);
const lightColors = getThemeColors('light', ACCENT_COLORS.teal);

const config: ExpoConfig = {
    name: 'play',
    slug: 'ghhghg',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'play',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
        supportsTablet: true,
        bundleIdentifier: 'com.jarvisuser.play',
        infoPlist: {
            UIBackgroundModes: ['audio'],
        },
    },
    android: {
        adaptiveIcon: {
            backgroundColor: darkColors.screenBackground,
            foregroundImage: './assets/images/android-icon-foreground.png',
        },
        edgeToEdgeEnabled: true,
        predictiveBackGestureEnabled: false,
        permissions: [
            'android.permission.RECORD_AUDIO',
            'android.permission.MODIFY_AUDIO_SETTINGS',
            'android.permission.FOREGROUND_SERVICE',
            'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
            'android.permission.POST_NOTIFICATIONS',
            'android.permission.READ_EXTERNAL_STORAGE',
            'android.permission.WRITE_EXTERNAL_STORAGE',
            'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
            'android.permission.ACCESS_MEDIA_LOCATION',
            'android.permission.READ_MEDIA_AUDIO',
            'android.permission.READ_MEDIA_IMAGES',
            'android.permission.READ_MEDIA_VIDEO',
        ],
        package: 'com.jarvisuser.play',
    },
    web: {
        output: 'static',
    },
    plugins: [
        'expo-router',
        [
            'expo-splash-screen',
            {
                image: './assets/images/splash-icon.png',
                imageWidth: 200,
                resizeMode: 'contain',
                backgroundColor: lightColors.screenBackground,
                dark: {
                    backgroundColor: darkColors.screenBackground,
                },
            },
        ],
        [
            'expo-av',
            {
                microphonePermission: 'Allow Sonic Flow to access your microphone.',
                backgroundAudio: true,
            },
        ],
        'expo-audio',
        'expo-video',
        'expo-asset',
        [
            'expo-media-library',
            {
                photosPermission: 'Allow Sonic Flow to access your photos.',
                savePhotosPermission: 'Allow Sonic Flow to save photos.',
                isAccessMediaLocationEnabled: true,
                granularPermissions: ['audio', 'photo', 'video'],
            },
        ],
        'expo-secure-store',
    ],
    experiments: {
        typedRoutes: true,
        reactCompiler: true,
    },
    extra: {
        router: {},
        eas: {
            projectId: 'f07ce253-8e73-4807-a760-2e89501b156c',
        },
    },
    owner: 'reakuser',
};

export default config;
