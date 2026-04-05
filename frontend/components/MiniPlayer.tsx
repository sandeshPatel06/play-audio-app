import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useVideoPlayer, VideoView, VideoPlayer } from 'expo-video';
import React, { useCallback, useEffect, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAudio } from '../hooks/useAudio';
import { useSafeRouterPush } from '../hooks/useSafeRouterPush';
import ScalePressable from './ScalePressable';

function MiniVideoThumbnail({ uri, isPlaying }: { uri: string, isPlaying: boolean }) {
    const videoPlayer = useVideoPlayer(
        uri,
        useCallback((player: VideoPlayer) => {
            player.muted = true;
            player.loop = false;
            player.showNowPlayingNotification = false;
            player.staysActiveInBackground = false;
        }, [])
    );

    useEffect(() => {
        if (!videoPlayer) return;
        if (isPlaying) {
            videoPlayer.play();
        } else {
            videoPlayer.pause();
        }
    }, [isPlaying, videoPlayer]);

    useEffect(() => {
        return () => {
            if (videoPlayer) {
                videoPlayer.pause();
            }
        };
    }, [uri, videoPlayer]);

    if (!videoPlayer) return null;

    return (
        <VideoView
            player={videoPlayer}
            style={StyleSheet.absoluteFill}
            nativeControls={false}
            contentFit="cover"
        />
    );
}

export default function MiniPlayer() {
    const insets = useSafeAreaInsets();
    const { width: screenWidth } = useWindowDimensions();
    const { colors } = useTheme();
    const { 
        currentSong, isPlaying, handlePlayPause, handleNext, handlePrevious, 
        position, duration, nowPlayingContext, remoteSongInfo
    } = useAudio();
    const safePush = useSafeRouterPush();
    
    const isSmall = screenWidth < 375;
    const styles = useMemo(() => createStyles(colors, isSmall), [colors, isSmall]);

    if (!currentSong) return null;

    const isVideo = currentSong.mediaType === 'video';
    
    // Protect against NaN or undefined preventing the progress bar from rendering
    const safePosition = isNaN(position) ? 0 : Math.max(0, position);
    const safeDuration = isNaN(duration) || duration <= 0 ? 1 : duration;
    const progress = Math.min(1, safePosition / safeDuration);

    const formatTime = (seconds: number) => {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const onPlayPause = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        handlePlayPause();
    };

    const onNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        handleNext();
    };

    const onPrev = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        handlePrevious();
    };

    return (
        <View style={[styles.container, { bottom: Math.max(12, insets.bottom) + 88, shadowColor: colors.floatingShadow }]}>
            <View style={[styles.backgroundPanel, { backgroundColor: colors.floatingBackground, borderColor: colors.floatingBorder }]}>
                <View style={styles.contentWrapper}>
                    <View style={styles.mainRow}>
                        <Pressable onPress={() => safePush('/player')} style={styles.leftSection}>
                            {isVideo && currentSong.uri ? (
                                <View style={styles.artwork} pointerEvents="none">
                                    <MiniVideoThumbnail uri={currentSong.uri} isPlaying={isPlaying} />
                                </View>
                            ) : (
                                <Image source={require('../assets/images/placeholder.png')} style={styles.artwork} />
                            )}
                            <View style={styles.info}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text numberOfLines={1} style={[styles.title, { color: colors.text, flex: 1 }]}>
                                        {nowPlayingContext?.type === 'remote' ? (remoteSongInfo?.title || 'Syncing...') : currentSong.filename}
                                    </Text>
                                    {nowPlayingContext?.type === 'remote' && (
                                        <View style={{ backgroundColor: colors.accent, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}>
                                            <Text style={{ color: 'white', fontSize: 8, fontWeight: '900' }}>ROOM</Text>
                                        </View>
                                    )}
                                </View>
                                <Text numberOfLines={1} style={[styles.artist, { color: colors.textMuted }]}>
                                    {nowPlayingContext?.type === 'remote' ? (remoteSongInfo?.artist || 'Listening Room') : 'Unknown Artist'}
                                </Text>
                            </View>
                        </Pressable>

                        <View style={styles.controlsSide}>
                            <View style={styles.primaryControls}>
                                {nowPlayingContext?.type !== 'remote' && (
                                    <ScalePressable onPress={onPrev} hitSlop={15} style={styles.skipBtn}>
                                        <Ionicons name="play-skip-back" size={24} color={colors.text} />
                                    </ScalePressable>
                                )}
                                <ScalePressable onPress={onPlayPause} hitSlop={15} style={styles.playBtn}>
                                    <Ionicons name={isPlaying ? "pause" : "play"} size={28} color={colors.text} />
                                </ScalePressable>
                                {nowPlayingContext?.type !== 'remote' && (
                                    <ScalePressable onPress={onNext} hitSlop={15} style={styles.skipBtn}>
                                        <Ionicons name="play-skip-forward" size={24} color={colors.text} />
                                    </ScalePressable>
                                )}
                            </View>
                        </View>
                    </View>

                    <Pressable onPress={() => safePush('/player')} style={styles.progressRow}>
                        <Text style={[styles.timeText, { color: colors.textMuted }]} numberOfLines={1}>{formatTime(safePosition)}</Text>
                        <View style={[styles.progressBarContainer, { backgroundColor: colors.progressTrack }]}>
                            <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: colors.accent }]} />
                        </View>
                        <Text style={[styles.timeText, { color: colors.textMuted }]} numberOfLines={1}>{formatTime(duration)}</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}



function createStyles(colors: any, isSmall: boolean) {
    return StyleSheet.create({
        container: {
            position: 'absolute',
            left: isSmall ? 4 : 8,
            right: isSmall ? 4 : 8,
            height: isSmall ? 78 : 86,
            zIndex: 50,
            elevation: 10,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.4,
            shadowRadius: 10,
        },
        backgroundPanel: {
            flex: 1,
            borderRadius: isSmall ? 6 : 8,
            borderWidth: 1,
            overflow: 'hidden',
        },
        contentWrapper: {
            flex: 1,
            paddingHorizontal: isSmall ? 10 : 12,
            paddingVertical: isSmall ? 8 : 10,
            justifyContent: 'center',
        },
        mainRow: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
        },
        artwork: {
            width: isSmall ? 40 : 44,
            height: isSmall ? 40 : 44,
            borderRadius: isSmall ? 3 : 4,
            marginRight: 10,
            overflow: 'hidden',
        },
        leftSection: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
            paddingRight: 10,
        },
        info: {
            flex: 1,
            justifyContent: 'center',
        },
        title: {
            fontSize: isSmall ? 12 : 13,
            fontWeight: '700',
            marginBottom: 2,
        },
        artist: {
            fontSize: isSmall ? 10 : 11,
            fontWeight: '500',
        },
        controlsSide: {
            justifyContent: 'center',
            alignItems: 'center',
            width: isSmall ? 100 : 110,
        },
        primaryControls: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            paddingHorizontal: isSmall ? 4 : 6,
        },
        skipBtn: {
            padding: 4,
        },
        playBtn: {
            padding: 4,
        },
        progressRow: {
            flexDirection: 'row',
            alignItems: 'center',
            height: isSmall ? 12 : 14,
            marginTop: isSmall ? 4 : 6,
        },
        timeText: {
            fontSize: isSmall ? 9 : 10,
            fontWeight: '500',
            fontVariant: ['tabular-nums'],
            width: isSmall ? 32 : 36,
            textAlign: 'center',
        },
        progressBarContainer: {
            flex: 1,
            height: isSmall ? 3 : 4,
            borderRadius: isSmall ? 1.5 : 2,
            marginHorizontal: 4,
            overflow: 'hidden',
        },
        progressBarBg: {
            ...StyleSheet.absoluteFillObject,
        },
        progressBar: {
            height: '100%',
            borderRadius: isSmall ? 1.5 : 2,
        },
    });
}
