import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, SlideInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAudio } from '../hooks/useAudio';
import ScalePressable from './ScalePressable';

export default function MiniPlayer() {
    const insets = useSafeAreaInsets();
    const { colors, theme } = useTheme();
    const { currentSong, isPlaying, handlePlayPause, handleNext, handlePrevious, position, duration } = useAudio();
    const router = useRouter();

    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            translateX.value = event.translationX;
            translateY.value = event.translationY;
        })
        .onEnd((event) => {
            if (event.translationX > 100) {
                // Swipe Right - Previous
                runOnJS(handlePrevious)();
            } else if (event.translationX < -100) {
                // Swipe Left - Next
                runOnJS(handleNext)();
            } else if (event.translationY < -100) {
                // Swipe Up - Open Player
                runOnJS(router.push)('/player' as any);
            }
            translateX.value = withSpring(0);
            translateY.value = withSpring(0);
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value * 0.2 },
            { translateY: translateY.value * 0.2 }
        ],
    }));

    if (!currentSong) return null;

    const progress = duration > 0 ? (position / duration) : 0;

    const onPlayPause = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        handlePlayPause();
    };

    const containerStyle = [
        styles.container,
        {
            bottom: insets.bottom + 10,
            backgroundColor: Platform.OS === 'android' ? colors.surface : 'transparent'
        }
    ];

    const Content = (
        <>
            <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: colors.accent }]} />
            </View>
            <ScalePressable
                style={styles.content}
                onPress={() => router.push('/player' as any)}
                scaleTo={0.98}
            >
                <Image
                    source={require('../assets/images/placeholder.png')}
                    style={styles.artwork}
                />
                <View style={styles.info}>
                    <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
                        {currentSong.filename}
                    </Text>
                    <Text style={[styles.artist, { color: colors.textMuted }]}>Sonic Flow</Text>
                </View>
            </ScalePressable>
            <ScalePressable
                style={[styles.playBtn, { backgroundColor: colors.accent }]}
                onPress={onPlayPause}
            >
                <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#FFF" />
            </ScalePressable>
        </>
    );

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View
                entering={SlideInDown.springify().damping(15)}
                style={[containerStyle, { overflow: 'hidden' }, animatedStyle]}
            >
                {Platform.OS === 'ios' ? (
                    <BlurView
                        intensity={80}
                        tint={theme === 'dark' ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFill}
                    >
                        <View style={styles.contentWrapper}>{Content}</View>
                    </BlurView>
                ) : (
                    <View style={styles.contentWrapper}>{Content}</View>
                )}
            </Animated.View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 20,
        right: 20,
        height: 70,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 0,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    progressBarContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
    },
    contentWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingTop: 3, // Space for progress bar
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    artwork: {
        width: 45,
        height: 45,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    info: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
    },
    artist: {
        fontSize: 12,
        fontWeight: '500',
    },
    playBtn: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
});
