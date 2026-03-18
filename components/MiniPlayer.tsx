import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAudio } from '../hooks/useAudio';
import { useSafeRouterPush } from '../hooks/useSafeRouterPush';
import ScalePressable from './ScalePressable';

export default function MiniPlayer() {
    const insets = useSafeAreaInsets();
    const { colors, resolvedTheme } = useTheme();
    const { currentSong, isPlaying, handlePlayPause, position, duration } = useAudio();
    const safePush = useSafeRouterPush();

    if (!currentSong) return null;

    const progress = duration > 0 ? (position / duration) : 0;

    const onPlayPause = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        handlePlayPause();
    };

    const containerStyle = [
        styles.container,
        {
            bottom: insets.bottom + 88,
            backgroundColor: Platform.OS === 'android' ? colors.floatingBackground : colors.transparent,
            borderColor: colors.floatingBorder,
            shadowColor: colors.floatingShadow,
        }
    ];

    const Content = (
        <>
            <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarContainerBg, { backgroundColor: colors.progressTrack }]} />
                <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: colors.accent }]} />
            </View>
            <ScalePressable
                style={styles.content}
                onPress={() => safePush('/player')}
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
                <Ionicons name={isPlaying ? "pause" : "play"} size={24} color={colors.onAccent} />
            </ScalePressable>
        </>
    );

    return (
        <View style={[containerStyle, { overflow: 'hidden' }]}>
            {Platform.OS === 'ios' ? (
                <BlurView
                    intensity={80}
                    tint={resolvedTheme === 'dark' ? 'dark' : 'light'}
                    style={StyleSheet.absoluteFill}
                >
                    <View style={styles.contentWrapper}>{Content}</View>
                </BlurView>
            ) : (
                <View style={styles.contentWrapper}>{Content}</View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 20,
        right: 20,
        height: 76,
        zIndex: 50,
        borderRadius: 20,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 0,
        elevation: 10,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 14,
    },
    progressBarContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    progressBarContainerBg: {
        ...StyleSheet.absoluteFillObject,
    },
    progressBar: {
        height: '100%',
    },
    contentWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 4,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    artwork: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    info: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '800',
    },
    artist: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    playBtn: {
        width: 46,
        height: 46,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
});
