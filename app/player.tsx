import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Platform,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import RenameModal from '../components/RenameModal';
import ScalePressable from '../components/ScalePressable';
import { useTheme } from '../context/ThemeContext';
import { useAudio } from '../hooks/useAudio';

const { width } = Dimensions.get('window');

export default function FullPlayerScreen() {
    useKeepAwake();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const [isRenameModalVisible, setRenameModalVisible] = useState(false);
    const {
        currentSong,
        isPlaying,
        handlePlayPause,
        handleNext,
        handlePrevious,
        position,
        duration,
        seekTo,
        shuffle,
        setShuffle,
        repeatMode,
        setRepeatMode,
        deleteSong,
        renameSong,
        likedIds,
        toggleLike,
        playlists,
        addToPlaylist
    } = useAudio();
    const [isAddPlaylistVisible, setIsAddPlaylistVisible] = useState(false);
    const router = useRouter();

    const translateY = useSharedValue(0);

    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            if (event.translationY > 0) {
                translateY.value = event.translationY;
            }
        })
        .onEnd((event) => {
            if (event.translationY > 150 || event.velocityY > 1000) {
                runOnJS(router.back)();
            } else {
                translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    if (!currentSong) return null;

    const onMenuPress = () => {
        Haptics.selectionAsync();
        Alert.alert(
            currentSong.filename,
            'Manage this song',
            [
                { text: 'Add to Playlist', onPress: () => setIsAddPlaylistVisible(true) },
                { text: 'Rename', onPress: () => setRenameModalVisible(true) },
                { text: 'Delete', onPress: () => confirmDelete(), style: 'destructive' },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const confirmDelete = () => {
        Alert.alert(
            'Delete Song',
            'Are you sure you want to permanently delete this song?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', onPress: handleDelete, style: 'destructive' }
            ]
        );
    };

    const handleDelete = async () => {
        const success = await deleteSong(currentSong);
        if (success) {
            router.back();
        } else {
            Alert.alert('Error', 'Failed to delete song');
        }
    };

    const handleRename = async (newName: string) => {
        const success = await renameSong(currentSong, newName);
        if (success) {
            setRenameModalVisible(false);
        } else {
            Alert.alert('Error', 'Failed to rename song');
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const toggleRepeat = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (repeatMode === 'off') setRepeatMode('all');
        else if (repeatMode === 'all') setRepeatMode('one');
        else setRepeatMode('off');
    };

    const onPlayPause = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        handlePlayPause();
    };

    const onNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        handleNext();
    };

    const onPrevious = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        handlePrevious();
    };

    const onShuffle = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShuffle(!shuffle);
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Cinematic Background */}
            <View style={StyleSheet.absoluteFill}>
                <Image
                    source={require('../assets/images/placeholder.png')}
                    style={StyleSheet.absoluteFill}
                    blurRadius={Platform.OS === 'ios' ? 0 : 80}
                />
                <LinearGradient
                    colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)', '#000']}
                    style={StyleSheet.absoluteFill}
                />
                {Platform.OS === 'ios' && (
                    <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
                )}
            </View>

            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.mainContent, animatedStyle, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 }]}>
                    {/* Header */}
                    <Animated.View
                        entering={FadeInDown.delay(200).duration(800)}
                        style={styles.header}
                    >
                        <ScalePressable style={styles.headerBtn} onPress={() => router.back()}>
                            <Ionicons name="chevron-down" size={28} color="#FFF" />
                        </ScalePressable>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>PLAYING FROM LIBRARY</Text>
                            <Text numberOfLines={1} style={styles.headerSubtitle}>Sonic Flow Premium</Text>
                        </View>
                        <ScalePressable style={styles.headerBtn} onPress={onMenuPress}>
                            <Ionicons name="ellipsis-horizontal" size={24} color="#FFF" />
                        </ScalePressable>
                    </Animated.View>

                    {/* Animated Artwork */}
                    <Animated.View
                        entering={FadeIn.delay(400).duration(1000)}
                        style={styles.artworkContainer}
                    >
                        <Image
                            source={require('../assets/images/placeholder.png')}
                            style={styles.artwork}
                        />
                    </Animated.View>

                    {/* Song Info */}
                    <Animated.View
                        entering={FadeInUp.delay(600).duration(800)}
                        style={styles.songInfo}
                    >
                        <View style={styles.titleRow}>
                            <View style={{ flex: 1 }}>
                                <Text numberOfLines={1} style={styles.title}>{currentSong.filename}</Text>
                                <Text style={styles.artist}>Sonic Flow Artist</Text>
                            </View>
                            <ScalePressable onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                toggleLike(currentSong.id);
                            }}>
                                <Ionicons
                                    name={likedIds.includes(currentSong.id) ? "heart" : "heart-outline"}
                                    size={28}
                                    color={likedIds.includes(currentSong.id) ? colors.accent : "#FFF"}
                                />
                            </ScalePressable>
                        </View>
                    </Animated.View>

                    <View style={styles.sliderContainer}>
                        <Slider
                            style={styles.slider}
                            minimumValue={0}
                            maximumValue={duration}
                            value={position}
                            minimumTrackTintColor={colors.accent}
                            maximumTrackTintColor="rgba(255,255,255,0.2)"
                            thumbTintColor="#FFF"
                            onSlidingComplete={seekTo}
                        />
                        <View style={styles.timeRow}>
                            <Text style={styles.timeText}>{formatTime(position)}</Text>
                            <Text style={styles.timeText}>{formatTime(duration)}</Text>
                        </View>
                    </View>

                    <View style={styles.controls}>
                        <ScalePressable onPress={onShuffle} style={styles.controlBtn}>
                            <Ionicons
                                name="shuffle"
                                size={24}
                                color={shuffle ? colors.accent : "rgba(255,255,255,0.5)"}
                            />
                        </ScalePressable>

                        <ScalePressable onPress={onPrevious} style={styles.controlBtn}>
                            <Ionicons name="play-back" size={36} color="#FFF" />
                        </ScalePressable>

                        <ScalePressable
                            onPress={onPlayPause}
                            style={[styles.playBtn, { backgroundColor: colors.accent }]}
                        >
                            <Ionicons name={isPlaying ? "pause" : "play"} size={42} color="#FFF" />
                        </ScalePressable>

                        <ScalePressable onPress={onNext} style={styles.controlBtn}>
                            <Ionicons name="play-forward" size={36} color="#FFF" />
                        </ScalePressable>

                        <ScalePressable onPress={toggleRepeat} style={styles.controlBtn}>
                            <View>
                                <Ionicons
                                    name="repeat"
                                    size={24}
                                    color={repeatMode !== 'off' ? colors.accent : "rgba(255,255,255,0.5)"}
                                />
                                {repeatMode === 'one' && (
                                    <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                                        <Text style={styles.badgeText}>1</Text>
                                    </View>
                                )}
                            </View>
                        </ScalePressable>
                    </View>

                    <View style={styles.footer}>
                        <ScalePressable style={styles.footerBtn}>
                            <Ionicons name="share-outline" size={22} color="rgba(255,255,255,0.6)" />
                        </ScalePressable>
                        <ScalePressable style={styles.footerBtn} onPress={() => router.push('/(tabs)')}>
                            <Ionicons name="list" size={24} color="rgba(255,255,255,0.6)" />
                        </ScalePressable>
                    </View>
                </Animated.View>
            </GestureDetector>

            <RenameModal
                visible={isRenameModalVisible}
                onClose={() => setRenameModalVisible(false)}
                onRename={handleRename}
                currentName={currentSong.filename.substring(0, currentSong.filename.lastIndexOf('.'))}
            />
            <AddToPlaylistModal
                visible={isAddPlaylistVisible}
                onClose={() => setIsAddPlaylistVisible(false)}
                playlists={playlists}
                onSelect={(playlistId: string) => {
                    if (currentSong) {
                        addToPlaylist(playlistId, currentSong.id);
                        setIsAddPlaylistVisible(false);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    mainContent: {
        flex: 1,
        paddingHorizontal: 30,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTextContainer: {
        alignItems: 'center',
        flex: 1,
    },
    headerTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 2,
    },
    headerSubtitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
        marginTop: 2,
    },
    artworkContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 20,
    },
    artwork: {
        width: width * 0.85,
        height: width * 0.85,
        borderRadius: 30,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    songInfo: {
        marginBottom: 20,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: -0.5,
    },
    artist: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.6)',
        marginTop: 4,
    },
    sliderContainer: {
        marginBottom: 20,
    },
    slider: {
        width: '100%',
        height: 40,
        marginLeft: -15, // Slider has internal padding
        marginRight: -15,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: -5,
    },
    timeText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    controlBtn: {
        padding: 10,
    },
    playBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -6,
        width: 14,
        height: 14,
        borderRadius: 7,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        fontSize: 8,
        color: '#FFF',
        fontWeight: '900',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'auto',
    },
    footerBtn: {
        padding: 10,
    },
});
