const { getThemeColors, ACCENT_COLORS } = require('./constants/colors.config');


const darkColors = getThemeColors('dark', ACCENT_COLORS.teal);
const lightColors = getThemeColors('light', ACCENT_COLORS.teal);

/** @type {import('expo/config').ExpoConfig} */
const config = {
    name: 'play-buzz',
    slug: 'play-vee',
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
                photosPermission: 'Allow Play-Buzz to access your photos.',
                savePhotosPermission: 'Allow Play-Buzz to save photos.',
                isAccessMediaLocationEnabled: true,
                granularPermissions: ['audio', 'photo', 'video'],
            },
        ],
        'expo-font',
    ],
    extra: {
        router: {},
        eas: {
            projectId: '7b26e7c8-b984-4457-9d20-978b203ebd66',
        },
        EXPO_PUBLIC_WS_URL: process.env.EXPO_PUBLIC_WS_URL,
        EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    },
    owner: 'playveeuser',
};

module.exports = config;
