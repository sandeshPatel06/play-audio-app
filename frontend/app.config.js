const { getThemeColors, ACCENT_COLORS } = require('./constants/colors.config');


const darkColors = getThemeColors('dark', ACCENT_COLORS.teal);

/** @type {import('expo/config').ExpoConfig} */
const config = {
    name: 'just-play',
    slug: 'test-vee',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'play',
    userInterfaceStyle: 'automatic',
    newArchEnabled: false,
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
        predictiveBackGestureEnabled: false,
        permissions: [
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
        'expo-dev-client',

        [
            'expo-audio',
            {
                enableBackgroundPlayback: true,
            },
        ],
        [
            'expo-video',
            {
                supportsPictureInPicture: true,
            },
        ],
        'expo-asset',
        [
            'expo-media-library',
            {
                photosPermission: 'Allow Just-Play to access your photos.',
                savePhotosPermission: 'Allow Just-Play to save photos.',
                isAccessMediaLocationEnabled: true,
                granularPermissions: ['audio', 'photo', 'video'],
            },
        ],
        'expo-font',
    ],
    extra: {
        router: {},
        eas: {
            projectId: '802e617d-6acc-4290-9a3b-edb83e17e119',
        },
        EXPO_PUBLIC_WS_URL: process.env.EXPO_PUBLIC_WS_URL,
        EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    },
    owner: 'userofplayvee',
};

module.exports = config;
