import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useKeepAwake } from 'expo-keep-awake';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, useRef } from 'react';
import { Animated, Share, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScalePressable from '../components/ScalePressable';
import { useTheme } from '../context/ThemeContext';
import { useAudio } from '../hooks/useAudio';

export default function VideoPlayerScreen() {
    useKeepAwake();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const router = useRouter();

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

    const remaining = Math.max(duration - position, 0);

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
                        <Ionicons name="chevron-down" size={28} color="#FFF" />
                    </ScalePressable>
                    <View style={styles.headerCenter}>
                        <Text numberOfLines={1} style={styles.headerTitle}>{currentSong?.filename}</Text>
                        <Text style={styles.headerEyebrow}>Video Stream</Text>
                    </View>
                    <ScalePressable style={styles.iconBtn} onPress={handlePiP}>
                        <Ionicons name="tv-outline" size={22} color="#FFF" />
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
                            maximumTrackTintColor="rgba(255,255,255,0.3)"
                            thumbTintColor="#FFF"
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
                            <Ionicons name="share-social-outline" size={24} color="#FFF" />
                        </ScalePressable>
                        <ScalePressable style={styles.mainControl} onPress={() => { handlePrevious(); resetControlsTimeout(); }}>
                            <Ionicons name="play-skip-back" size={28} color="#FFF" />
                        </ScalePressable>
                        <ScalePressable style={[styles.playControl, { backgroundColor: colors.accent }]} onPress={() => { handlePlayPause(); resetControlsTimeout(); }}>
                            <Ionicons name={isPlaying ? 'pause' : 'play'} size={38} color={colors.onAccent} />
                        </ScalePressable>
                        <ScalePressable style={styles.mainControl} onPress={() => { handleNext(); resetControlsTimeout(); }}>
                            <Ionicons name="play-skip-forward" size={28} color="#FFF" />
                        </ScalePressable>
                        <ScalePressable style={styles.sideControl} onPress={handleRotate}>
                            <Ionicons name="expand-outline" size={26} color="#FFF" />
                        </ScalePressable>
                    </View>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        marginHorizontal: 16,
        alignItems: 'center',
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    headerEyebrow: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    bottomControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        paddingTop: 30,
        backgroundColor: 'rgba(0,0,0,0.6)',
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
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
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
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mainControl: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    playControl: {
        width: 76,
        height: 76,
        borderRadius: 38,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
