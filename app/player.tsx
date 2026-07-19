import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Platform,
} from 'react-native';
import CommunitySlider from '@react-native-community/slider';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import { ActionDialog, ConfirmDialog, NoticeDialog } from '../components/AppDialogs';
import ScalePressable from '../components/ScalePressable';
import { CORE_COLORS, withAlpha } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import { useAudio } from '../hooks/useAudio';
import { useSafeRouterPush } from '../hooks/useSafeRouterPush';
import { useAudioStore } from '../store/useAudioStore';
import { AudioTrack } from '../types/audio';


const PLACEHOLDER_ART = require('../assets/images/placeholder.png');
const AnimatedImage = Animated.createAnimatedComponent(Image);
const AnimatedSlider = Animated.createAnimatedComponent(CommunitySlider);


type QueueListItem = {
  key: string;
  track: AudioTrack;
};

export default function FullPlayerScreen() {
  useKeepAwake();

  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { colors, resolvedTheme } = useTheme();
  const router = useRouter();
  const safePush = useSafeRouterPush();
  
  const isSmall = screenWidth < 375;
  const isShort = screenHeight < 700;
  
  const artSize = Math.min(screenWidth - 64, Math.max(240, Math.min(360, screenWidth * 0.85)));

  const [isActionVisible, setIsActionVisible] = useState(false);
  const [isDeleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [isAddPlaylistVisible, setIsAddPlaylistVisible] = useState(false);
  const [isQueueActionVisible, setIsQueueActionVisible] = useState(false);
  const [selectedQueueIndex, setSelectedQueueIndex] = useState<number | null>(null);
  const [isSliding, setIsSliding] = useState(false);
  const [slidingValue, setSlidingValue] = useState(0);
  const [noticeState, setNoticeState] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  const position = useAudioStore((state) => state.position);
  const duration = useAudioStore((state) => state.duration);

  const {
    currentTrack,
    queue,
    currentIndex,
    nowPlayingContext,
    isPlaying,
    shuffle,
    repeatMode,
    playlists,
    likedIds,
    adaptiveAccent,
    handlePlayPause,
    handleNext,
    handlePrevious,
    seekTo,
    setShuffle,
    setRepeatMode,
    addToPlaylist,
    deleteSong,
    toggleLike,
    selectQueueItem,
    enqueueTracks,
    moveQueueItem,
    removeQueueItem,
  } = useAudio();


  const pulse = useRef(new Animated.Value(1)).current;
  const accent = adaptiveAccent || colors.accent;
  const activeTrack = currentTrack;
  const playbackQueue = queue as unknown as AudioTrack[];
  
  const artworkSource = useMemo(() => {
    return activeTrack?.imageUrl
      ? { uri: activeTrack.imageUrl }
      : PLACEHOLDER_ART;
  }, [activeTrack?.imageUrl]);

  const queueItems = useMemo<QueueListItem[]>(
    () => playbackQueue.map((track, index) => ({ key: `${track.id}-${index}`, track })),
    [playbackQueue]
  );

  const selectedQueueTrack = selectedQueueIndex !== null ? playbackQueue[selectedQueueIndex] ?? null : null;
  
  const sourceLabel = useMemo(() => {
    switch (nowPlayingContext?.type) {
        case 'playlist': return 'Playlist';
        case 'liked': return 'Liked Songs';
        case 'jiosaavn': return 'JioSaavn';
        case 'remote': return 'Stream';
        default: return 'Library';
    }
  }, [nowPlayingContext?.type]);

  const isVideoTrack = useMemo(() => {
    if (!activeTrack) return false;
    const path = (activeTrack.uri || activeTrack.filename || '').toLowerCase();
    return /\.(mp4|m4v|mov|webm|m3u8)(\?.*)?$/i.test(path);
  }, [activeTrack]);

  const videoPlayer = useVideoPlayer(isVideoTrack && activeTrack ? activeTrack.uri : null, (player) => {
    player.muted = true;
    player.loop = false;
    player.showNowPlayingNotification = false;
    player.staysActiveInBackground = false;
    player.play();
  });

  // Pulse animation for artwork
  useEffect(() => {
    pulse.stopAnimation();
    if (isPlaying && !isVideoTrack) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.04, duration: 2500, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 2500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      Animated.spring(pulse, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }).start();
    }
  }, [isPlaying, isVideoTrack, pulse]);

  // Video sync
  useEffect(() => {
    if (!isVideoTrack || !activeTrack || !videoPlayer) return;
    if (Math.abs(videoPlayer.currentTime - position) > 1) {
      videoPlayer.currentTime = position;
    }
    if (isPlaying) videoPlayer.play();
    else videoPlayer.pause();
  }, [activeTrack, isPlaying, isVideoTrack, position, videoPlayer]);

  const progressAnim = useRef(new Animated.Value(position)).current;

  // Sync Animated Value smoothly
  useEffect(() => {
    if (isSliding) return;
    
    // Animate smoothly to the expected next position based on our 250ms polling interval
    Animated.timing(progressAnim, {
      toValue: isPlaying ? position + 0.25 : position,
      duration: isPlaying ? 250 : 100,
      useNativeDriver: false, // Slider value prop doesn't support native driver
    }).start();
  }, [position, isPlaying, isSliding]);

  // We keep a simple state for text rendering which updates at 250ms (doesn't cause jitter)
  const [textPosition, setTextPosition] = useState(position);
  useEffect(() => {
    if (!isSliding) setTextPosition(position);
  }, [position, isSliding]);




  const formatTime = useCallback((seconds: number) => {

    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  const onSeekComplete = async (val: number) => {
    await seekTo(val);
    if (isVideoTrack && videoPlayer) {
      videoPlayer.currentTime = val;
    }
    progressAnim.setValue(val);
    setTextPosition(val);
    setIsSliding(false);
  };




  const onToggleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openQueueActions = (index: number) => {
    setSelectedQueueIndex(index);
    setIsQueueActionVisible(true);
    Haptics.selectionAsync();
  };

  const renderQueueItem = useCallback(({ item, drag, getIndex, isActive }: any) => {
    const queueIndex = getIndex?.() ?? 0;
    const track = item.track;
    const isCurrent = queueIndex === currentIndex;

    return (
      <View style={[
        styles.queueRow, 
        { 
          backgroundColor: isCurrent ? withAlpha(accent, 0.12) : 'transparent',
          borderColor: isCurrent ? withAlpha(accent, 0.3) : colors.cardBorder,
          opacity: isActive ? 0.8 : 1
        }
      ]}>
        <ScalePressable style={styles.queueMain} onPress={() => selectQueueItem(queueIndex)}>
          <Image 
            source={track.imageUrl ? { uri: track.imageUrl } : PLACEHOLDER_ART} 
            style={styles.queueThumb} 
          />
          <View style={styles.queueInfo}>
            <Text numberOfLines={1} style={[styles.queueTitle, { color: isCurrent ? accent : colors.text }]}>
                {track.title || track.filename}
            </Text>
            <Text numberOfLines={1} style={[styles.queueArtist, { color: colors.textMuted }]}>
                {track.artist || 'Unknown Artist'}
            </Text>
          </View>
        </ScalePressable>
        
        <View style={styles.queueActions}>
          <ScalePressable onLongPress={drag} onPressIn={() => Haptics.selectionAsync()} style={styles.queueActionBtn}>
            <Ionicons name="reorder-three" size={22} color={colors.textMuted} />
          </ScalePressable>
          <ScalePressable onPress={() => openQueueActions(queueIndex)} style={styles.queueActionBtn}>
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
          </ScalePressable>
        </View>
      </View>
    );
  }, [accent, currentIndex, colors, selectQueueItem]);

  if (!activeTrack) {
    return (
      <View style={[styles.container, { backgroundColor: colors.screenBackground, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Nothing playing</Text>
        <ScalePressable onPress={() => router.back()} style={{ marginTop: 20 }}>
            <Text style={{ color: accent, fontWeight: '600' }}>Go Back</Text>
        </ScalePressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.screenBackground }]}>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      
      {/* Background Glow */}
      <View style={StyleSheet.absoluteFill}>
        {activeTrack.imageUrl && (
          <AnimatedImage 
            source={{ uri: activeTrack.imageUrl }} 
            blurRadius={Platform.OS === 'ios' ? 80 : 40}
            style={[styles.backgroundBlur, { opacity: 0.3, transform: [{ scale: pulse }] }]}
          />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(accent, 0.08) }]} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <ScalePressable onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-down" size={28} color={colors.text} />
          </ScalePressable>
          <View style={styles.headerText}>
            <Text style={[styles.headerEyebrow, { color: accent }]}>{sourceLabel}</Text>
            <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.text }]}>{nowPlayingContext?.title || 'Player'}</Text>
          </View>
          <ScalePressable onPress={() => setIsActionVisible(true)} style={styles.headerBtn}>
            <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
          </ScalePressable>
        </View>

        {/* Artwork Section */}
        <View style={styles.artworkContainer}>
          <Animated.View style={[styles.artworkGlow, { backgroundColor: accent, transform: [{ scale: pulse }] }]} />
          <View style={[styles.artworkWrapper, { borderColor: withAlpha(colors.text, 0.1), shadowColor: colors.text }]}>
            {isVideoTrack ? (
              <VideoView 
                player={videoPlayer} 
                nativeControls={false} 
                contentFit="cover" 
                style={[styles.artwork, { width: artSize, height: artSize }]} 
              />
            ) : (
              <AnimatedImage 
                source={artworkSource} 
                style={[styles.artwork, { width: artSize, height: artSize, transform: [{ scale: pulse }] }]} 
              />
            )}
          </View>
        </View>

        {/* Info & Like */}
        <View style={styles.trackInfoSection}>
          <View style={styles.titleArea}>
            <Text numberOfLines={1} style={[styles.trackTitle, { color: colors.text }]}>{activeTrack.title || activeTrack.filename}</Text>
            <Text numberOfLines={1} style={[styles.trackArtist, { color: colors.textMuted }]}>{activeTrack.artist || 'Unknown Artist'}</Text>
          </View>
          <ScalePressable 
            onPress={() => toggleLike(activeTrack.id)} 
            style={[styles.likeButton, { backgroundColor: withAlpha(accent, likedIds.has(activeTrack.id) ? 1 : 0.1) }]}
          >
            <Ionicons 
                name={likedIds.has(activeTrack.id) ? "heart" : "heart-outline"} 
                size={24} 
                color={likedIds.has(activeTrack.id) ? CORE_COLORS.white : colors.text} 
            />
          </ScalePressable>
        </View>

        {/* Slider Section */}
        <View style={styles.sliderSection}>


          <AnimatedSlider
            style={styles.slider}
            minimumValue={0}
            maximumValue={Math.max(duration, 1)}
            value={isSliding ? slidingValue : progressAnim}
            minimumTrackTintColor={accent}
            maximumTrackTintColor={withAlpha(colors.text, 0.1)}
            thumbTintColor={accent}
            onSlidingStart={() => {
              setIsSliding(true);
              setSlidingValue(position);
              Haptics.selectionAsync();
            }}
            onValueChange={setSlidingValue}
            onSlidingComplete={onSeekComplete}
          />
          <View style={styles.timeLabels}>
            <Text style={[styles.timeText, { color: colors.textMuted }]}>{formatTime(isSliding ? slidingValue : textPosition)}</Text>
            <Text style={[styles.timeText, { color: colors.textMuted }]}>-{formatTime(Math.max(0, duration - (isSliding ? slidingValue : textPosition)))}</Text>
          </View>
        </View>

        {/* Controls Section */}
        <View style={styles.controlsSection}>
          <ScalePressable onPress={() => setShuffle(!shuffle)} style={styles.secondaryCtrl}>
            <Ionicons name="shuffle" size={24} color={shuffle ? accent : colors.textMuted} />
          </ScalePressable>

          <ScalePressable onPress={handlePrevious} style={styles.mainCtrl}>
            <Ionicons name="play-skip-back" size={32} color={colors.text} />
          </ScalePressable>

          <ScalePressable 
            onPress={handlePlayPause} 
            style={[styles.playButton, { backgroundColor: accent, shadowColor: accent }]}
          >
            <Ionicons name={isPlaying ? "pause" : "play"} size={40} color={CORE_COLORS.white} style={{ marginLeft: isPlaying ? 0 : 4 }} />
          </ScalePressable>

          <ScalePressable onPress={handleNext} style={styles.mainCtrl}>
            <Ionicons name="play-skip-forward" size={32} color={colors.text} />
          </ScalePressable>

          <ScalePressable onPress={onToggleRepeat} style={styles.secondaryCtrl}>
            <View>
              <Ionicons name="repeat" size={24} color={repeatMode !== 'off' ? accent : colors.textMuted} />
              {repeatMode === 'one' && <View style={[styles.repeatOneDot, { backgroundColor: accent }]} />}
            </View>
          </ScalePressable>
        </View>

        {/* Queue Section */}
        <View style={styles.queueSection}>
          <View style={styles.queueHeader}>
            <Text style={[styles.queueHeaderText, { color: colors.text }]}>Up Next ({playbackQueue.length})</Text>
            {nowPlayingContext?.playlistId && (
              <ScalePressable onPress={() => safePush(`/playlist/${nowPlayingContext.playlistId}`)}>
                <Text style={{ color: accent, fontWeight: '700' }}>Full Playlist</Text>
              </ScalePressable>
            )}
          </View>

          <DraggableFlatList
            data={queueItems}
            keyExtractor={(item) => item.key}
            renderItem={renderQueueItem}
            scrollEnabled={false}
            activationDistance={20}
            onDragEnd={({ from, to }) => {
              if (from !== to) {
                moveQueueItem(from, to);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
            }}
          />
        </View>
      </ScrollView>

      {/* Modals & Dialogs */}
      <AddToPlaylistModal 
        visible={isAddPlaylistVisible} 
        onClose={() => setIsAddPlaylistVisible(false)} 
        playlists={playlists}
        onSelect={(id) => {
            addToPlaylist(id, activeTrack.id);
            setIsAddPlaylistVisible(false);
        }}
      />

      <ActionDialog 
        visible={isActionVisible}
        title={activeTrack.title || activeTrack.filename}
        subtitle={activeTrack.artist || 'Unknown'}
        imageSource={artworkSource}
        onClose={() => setIsActionVisible(false)}
        actions={[
          { key: 'playlist', label: 'Add to Playlist', icon: 'add-circle-outline', onPress: () => { setIsActionVisible(false); setIsAddPlaylistVisible(true); } },
          { key: 'share', label: 'Share Track', icon: 'share-social-outline', onPress: () => {
              setIsActionVisible(false);
              Share.share({ message: `${activeTrack.title} by ${activeTrack.artist}`, url: activeTrack.uri });
          }},
          { key: 'delete', label: 'Delete from Device', icon: 'trash-outline', danger: true, onPress: () => { setIsActionVisible(false); setDeleteConfirmVisible(true); } },
        ]}
      />

      <ConfirmDialog 
        visible={isDeleteConfirmVisible}
        title="Delete Song?"
        message="This will permanently remove the file from your storage."
        onConfirm={async () => {
            await deleteSong(activeTrack);
            setDeleteConfirmVisible(false);
            router.back();
        }}
        onClose={() => setDeleteConfirmVisible(false)}
        danger
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundBlur: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  artworkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
  },
  artworkWrapper: {
    borderRadius: 40,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 20,
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
  },
  artwork: {
    borderRadius: 40,
  },
  artworkGlow: {
    position: 'absolute',
    width: '70%',
    height: '70%',
    borderRadius: 100,
    opacity: 0.2,
    blurRadius: 50,
  },
  trackInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginBottom: 30,
  },
  titleArea: {
    flex: 1,
    marginRight: 20,
  },
  trackTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  trackArtist: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  likeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginTop: -5,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  controlsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 10,
    marginBottom: 40,
  },
  playButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  mainCtrl: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtrl: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatOneDot: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  queueSection: {
    paddingHorizontal: 20,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  queueHeaderText: {
    fontSize: 18,
    fontWeight: '800',
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
  },
  queueMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  queueThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: 15,
  },
  queueInfo: {
    flex: 1,
  },
  queueTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  queueArtist: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  queueActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  queueActionBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
