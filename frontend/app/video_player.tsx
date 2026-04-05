import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useKeepAwake } from 'expo-keep-awake';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Animated, Share, StyleSheet, Text, TouchableWithoutFeedback, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScalePressable from '../components/ScalePressable';
import { CORE_COLORS, withAlpha } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import { useAudio } from '../hooks/useAudio';

export default function VideoPlayerScreen() {
    useKeepAwake();
    const insets = useSafeAreaInsets();
    const { width: screenWidth } = useWindowDimensions();
    const { colors } = useTheme();
    const router = useRouter();
    const isSmall = screenWidth < 375;
    const styles = useMemo(() => createStyles(colors, isSmall), [colors, isSmall]);

    const {
        currentSong,
        isPlaying,
        position,
        duration,
        handlePlayPause,
        handleNext,
        handlePrevious,
        seekTo,
    } = useAudio();

    const [controlsVisible, setControlsVisible] = useState(true);
    const [isSliding, setIsSliding] = useState(false);
    const [slidingValue, setSlidingValue] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const videoViewRef = useRef<VideoView>(null);

    const videoPlayer = useVideoPlayer(currentSong?.uri || null, (player) => {
        player.muted = true; // Let expo-audio handle the actual sound
        player.loop = false;
        player.showNowPlayingNotification = false;
        player.staysActiveInBackground = false;
    });

    useEffect(() => {
        if (isPlaying) {
            videoPlayer.play();
        } else {
            videoPlayer.pause();
        }
    }, [isPlaying, videoPlayer]);

    const resetControlsTimeout = () => {
        if (hideTimeout.current) clearTimeout(hideTimeout.current);
        
        if (!controlsVisible) {
            setControlsVisible(true);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }

        hideTimeout.current = setTimeout(() => {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => setControlsVisible(false));
        }, 3500);
    };

    const toggleControls = () => {
        if (hideTimeout.current) clearTimeout(hideTimeout.current);

        if (controlsVisible) {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start(() => setControlsVisible(false));
        } else {
            setControlsVisible(true);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
            
            hideTimeout.current = setTimeout(() => {
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => setControlsVisible(false));
            }, 3500);
        }
    };

    useEffect(() => {
        resetControlsTimeout();
        return () => {
            if (hideTimeout.current) clearTimeout(hideTimeout.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onSeekComplete = async (val: number) => {
        await seekTo(val);
        videoPlayer.currentTime = val;
        setIsSliding(false);
        resetControlsTimeout();
    };

    const formatTime = (seconds: number) => {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };



    const handleShare = async () => {
        try {
            await Share.share({
                message: currentSong?.filename || 'Check out this video',
                url: currentSong?.uri,
            });
        } catch {}
        resetControlsTimeout();
    };

    const handleRotate = () => {
        videoViewRef.current?.enterFullscreen();
        resetControlsTimeout();
    };

    const handlePiP = async () => {
        try {
            await videoViewRef.current?.startPictureInPicture();
        } catch {}
        resetControlsTimeout();
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" hidden={!controlsVisible} />
            
            <VideoView
                ref={videoViewRef as any}
                player={videoPlayer}
                style={StyleSheet.absoluteFill}
                nativeControls={false}
                contentFit="contain"
            />
            
            <TouchableWithoutFeedback onPress={toggleControls}>
                <View style={StyleSheet.absoluteFill} />
            </TouchableWithoutFeedback>

            <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]} pointerEvents={controlsVisible ? 'box-none' : 'none'}>
                <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                    <ScalePressable style={styles.iconBtn} onPress={() => router.back()}>
                        <Ionicons name="chevron-down" size={28} color={colors.pureWhite} />
                    </ScalePressable>
                    <View style={styles.headerCenter}>
                        <Text numberOfLines={1} style={styles.headerTitle}>{currentSong?.filename}</Text>
                        <Text style={styles.headerEyebrow}>Video Stream</Text>
                    </View>
                    <ScalePressable style={styles.iconBtn} onPress={handlePiP}>
                        <Ionicons name="tv-outline" size={22} color={colors.pureWhite} />
                    </ScalePressable>
                </View>

                <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 30 }]}>
                    <View style={styles.sliderWrap}>
                        <Slider
                            style={styles.slider}
                            minimumValue={0}
                            maximumValue={Math.max(duration, 1)}
                            value={isSliding ? slidingValue : position}
                            minimumTrackTintColor={colors.accent}
                            maximumTrackTintColor={withAlpha(CORE_COLORS.white, 0.3)}
                            thumbTintColor={colors.pureWhite}
                            onSlidingStart={() => {
                                setIsSliding(true);
                                setSlidingValue(position);
                                resetControlsTimeout();
                            }}
                            onValueChange={(val) => {
                                setSlidingValue(val);
                            }}
                            onSlidingComplete={onSeekComplete}
                        />
                        <View style={styles.timeRow}>
                            <Text style={styles.timeText}>{formatTime(isSliding ? slidingValue : position)}</Text>
                            <Text style={styles.timeText}>-{formatTime(Math.max(0, duration - (isSliding ? slidingValue : position)))}</Text>
                        </View>
                    </View>

                    <View style={styles.controlRow}>
                        <ScalePressable style={styles.sideControl} onPress={handleShare}>
                            <Ionicons name="share-social-outline" size={24} color={colors.pureWhite} />
                        </ScalePressable>
                        <ScalePressable style={styles.mainControl} onPress={() => { handlePrevious(); resetControlsTimeout(); }}>
                            <Ionicons name="play-skip-back" size={28} color={colors.pureWhite} />
                        </ScalePressable>
                        <ScalePressable style={[styles.playControl, { backgroundColor: colors.accent }]} onPress={() => { handlePlayPause(); resetControlsTimeout(); }}>
                            <Ionicons name={isPlaying ? 'pause' : 'play'} size={38} color={colors.onAccent} />
                        </ScalePressable>
                        <ScalePressable style={styles.mainControl} onPress={() => { handleNext(); resetControlsTimeout(); }}>
                            <Ionicons name="play-skip-forward" size={28} color={colors.pureWhite} />
                        </ScalePressable>
                        <ScalePressable style={styles.sideControl} onPress={handleRotate}>
                            <Ionicons name="expand-outline" size={26} color={colors.pureWhite} />
                        </ScalePressable>
                    </View>
                </View>
            </Animated.View>
        </View>
    );
}



function createStyles(colors: any, isSmall: boolean) {
    return StyleSheet.create({
        container: {
            backgroundColor: CORE_COLORS.black,
        },
        header: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: isSmall ? 16 : 20,
            paddingTop: isSmall ? 50 : 60,
            paddingBottom: 20,
            backgroundColor: withAlpha(CORE_COLORS.white, 0.5),
        },
        iconBtn: {
            width: isSmall ? 40 : 44,
            height: isSmall ? 40 : 44,
            borderRadius: isSmall ? 20 : 22,
            backgroundColor: withAlpha(CORE_COLORS.white, 0.2),
            alignItems: 'center',
            justifyContent: 'center',
        },
        headerCenter: {
            flex: 1,
            marginHorizontal: 16,
            alignItems: 'center',
        },
        headerTitle: {
            color: CORE_COLORS.white,
            fontSize: isSmall ? 16 : 18,
            fontWeight: '700',
            textAlign: 'center',
        },
        headerEyebrow: {
            color: withAlpha(CORE_COLORS.white, 0.7),
            fontSize: isSmall ? 11 : 12,
            fontWeight: '600',
            marginTop: 2,
        },
        bottomControls: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: isSmall ? 20 : 24,
            paddingTop: isSmall ? 24 : 30,
            backgroundColor: withAlpha(CORE_COLORS.black, 0.6),
        },
        sliderWrap: {
            marginBottom: 20,
        },
        slider: {
            width: '100%',
            height: 40,
            marginLeft: -10,
            marginRight: -10,
        },
        timeRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: -6,
        },
        timeText: {
            color: withAlpha(CORE_COLORS.white, 0.8),
            fontSize: isSmall ? 11 : 12,
            fontWeight: '600',
        },
        controlRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-evenly',
            paddingHorizontal: 0,
            marginBottom: 10,
        },
        sideControl: {
            width: isSmall ? 40 : 44,
            height: isSmall ? 40 : 44,
            alignItems: 'center',
            justifyContent: 'center',
        },
        mainControl: {
            width: isSmall ? 50 : 56,
            height: isSmall ? 50 : 56,
            borderRadius: isSmall ? 25 : 28,
            backgroundColor: withAlpha(CORE_COLORS.white, 0.15),
            alignItems: 'center',
            justifyContent: 'center',
        },
        playControl: {
            width: isSmall ? 68 : 76,
            height: isSmall ? 68 : 76,
            borderRadius: isSmall ? 34 : 38,
            alignItems: 'center',
            justifyContent: 'center',
        },
    });
}
