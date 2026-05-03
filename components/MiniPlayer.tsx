import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useVideoPlayer, VideoView, VideoPlayer } from 'expo-video';
import React, { useCallback, useEffect, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAdaptiveTheme } from '../hooks/useAdaptiveTheme';
import { useAudioPlayer, usePlaybackQueue } from '../hooks/useAudio';
import { useSafeRouterPush } from '../hooks/useSafeRouterPush';
import ScalePressable from './ScalePressable';
import { GlassSurface } from './ui/primitives';

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
        try {
            if (isPlaying) {
                videoPlayer.play();
            } else {
                videoPlayer.pause();
            }
        } catch {
            // Player may have been released
        }
    }, [isPlaying, videoPlayer]);

    useEffect(() => {
        return () => {
            if (videoPlayer) {
                try {
                    videoPlayer.pause();
                } catch {
                    // Player may have been released
                }
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
    const theme = useAdaptiveTheme();
    const {
        currentTrack,
        isPlaying,
        position,
        duration,
        playPause,
        next,
        previous,
    } = useAudioPlayer();
    const { queue, currentIndex } = usePlaybackQueue();
    const safePush = useSafeRouterPush();
    
    const isSmall = screenWidth < 375;
    const styles = useMemo(() => createStyles(colors, isSmall), [colors, isSmall]);

    if (!currentTrack) return null;

    const isVideo = currentTrack.mediaType === 'video';
    const canSkip = queue.length > 1 || currentIndex > 0;
    
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
        playPause();
    };

    const onNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        next();
    };

    const onPrev = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        previous();
    };

    return (
        <View style={[styles.container, { bottom: Math.max(12, insets.bottom) + 90, shadowColor: colors.floatingShadow }]}>
            <GlassSurface
                variant="floating"
                blurIntensity={theme.blurIntensity + 4}
                style={[styles.backgroundPanel, { borderColor: colors.floatingBorder }]}
            >
                <View style={styles.contentWrapper}>
                    <View style={styles.mainRow}>
                        <Pressable onPress={() => safePush('/player')} style={styles.leftSection}>
                            {isVideo && currentTrack.uri ? (
                                <View style={styles.artwork} pointerEvents="none">
                                    <MiniVideoThumbnail uri={currentTrack.uri} isPlaying={isPlaying} />
                                </View>
                            ) : (
                                <Image
                                    source={currentTrack.imageUrl ? { uri: currentTrack.imageUrl } : require('../assets/images/placeholder.png')}
                                    style={styles.artwork}
                                />
                            )}
                            <View style={styles.info}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text numberOfLines={1} style={[styles.title, { color: colors.text, flex: 1 }]}>
                                        {currentTrack.title}
                                    </Text>
                                </View>
                                <Text numberOfLines={1} style={[styles.artist, { color: colors.textMuted }]}>
                                    {currentTrack.artist}
                                </Text>
                                <View style={[styles.contextChip, { backgroundColor: colors.accentSurface, borderColor: colors.accent }]}>
                                    <Text style={[styles.contextChipText, { color: colors.accent }]}>
                                        {isVideo ? 'Video' : 'Now Playing'}
                                    </Text>
                                </View>
                            </View>
                        </Pressable>

                        <View style={styles.controlsSide}>
                            <View style={styles.primaryControls}>
                                {canSkip && (
                                    <ScalePressable onPress={onPrev} hitSlop={15} style={styles.skipBtn}>
                                        <Ionicons name="play-skip-back" size={24} color={colors.text} />
                                    </ScalePressable>
                                )}
                                <ScalePressable onPress={onPlayPause} hitSlop={15} style={styles.playBtn}>
                                    <Ionicons name={isPlaying ? "pause" : "play"} size={28} color={colors.text} />
                                </ScalePressable>
                                {canSkip && (
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
                        <Text style={[styles.timeText, { color: colors.textMuted }]} numberOfLines={1}>{formatTime(safeDuration)}</Text>
                    </Pressable>
                </View>
            </GlassSurface>
        </View>
    );
}



function createStyles(colors: any, isSmall: boolean) {
    return StyleSheet.create({
        container: {
            position: 'absolute',
            left: isSmall ? 8 : 12,
            right: isSmall ? 8 : 12,
            height: isSmall ? 88 : 96,
            zIndex: 50,
            elevation: 10,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.24,
            shadowRadius: 18,
        },
        backgroundPanel: {
            flex: 1,
            borderRadius: isSmall ? 18 : 22,
            borderWidth: 1,
        },
        contentWrapper: {
            flex: 1,
            paddingHorizontal: isSmall ? 12 : 14,
            paddingVertical: isSmall ? 10 : 12,
            justifyContent: 'center',
        },
        mainRow: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
        },
        artwork: {
            width: isSmall ? 46 : 50,
            height: isSmall ? 46 : 50,
            borderRadius: isSmall ? 12 : 14,
            marginRight: 12,
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
            fontSize: isSmall ? 13 : 14,
            fontWeight: '800',
            marginBottom: 1,
        },
        artist: {
            fontSize: isSmall ? 11 : 12,
            fontWeight: '600',
        },
        contextChip: {
            alignSelf: 'flex-start',
            marginTop: 6,
            borderRadius: 999,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderWidth: 1,
        },
        contextChipText: {
            fontSize: 10,
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
        },
        controlsSide: {
            justifyContent: 'center',
            alignItems: 'center',
            width: isSmall ? 112 : 122,
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
            height: isSmall ? 16 : 18,
            marginTop: isSmall ? 6 : 8,
        },
        timeText: {
            fontSize: isSmall ? 9 : 10,
            fontWeight: '600',
            fontVariant: ['tabular-nums'],
            width: isSmall ? 32 : 36,
            textAlign: 'center',
        },
        progressBarContainer: {
            flex: 1,
            height: isSmall ? 4 : 5,
            borderRadius: 999,
            marginHorizontal: 6,
            overflow: 'hidden',
        },
        progressBarBg: {
            ...StyleSheet.absoluteFillObject,
        },
        progressBar: {
            height: '100%',
            borderRadius: 999,
        },
    });
}
