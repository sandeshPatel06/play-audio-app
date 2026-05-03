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
} from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import { ActionDialog, ConfirmDialog, NoticeDialog } from '../components/AppDialogs';
import ScalePressable from '../components/ScalePressable';
import WaveformSeekbar from '../components/WaveformSeekbar';
import { CORE_COLORS, withAlpha } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import { useAudio } from '../hooks/useAudio';
import { useSafeRouterPush } from '../hooks/useSafeRouterPush';
import { AudioTrack } from '../types/audio';

const PLACEHOLDER_ART = require('../assets/images/placeholder.png');
const AnimatedImage = Animated.createAnimatedComponent(Image);

type QueueListItem = {
  key: string;
  track: AudioTrack;
};

export default function FullPlayerScreen() {
  useKeepAwake();

  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { colors, resolvedTheme } = useTheme();
  const router = useRouter();
  const safePush = useSafeRouterPush();
  const isSmall = screenWidth < 375;
  const isMedium = screenWidth >= 375 && screenWidth < 414;
  const artSize = Math.min(screenWidth - 72, Math.max(220, Math.min(340, screenWidth * 0.82)));
  const styles = useMemo(
    () => createStyles(colors, isSmall, isMedium, artSize, screenWidth),
    [artSize, colors, isMedium, isSmall, screenWidth]
  );

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

  const {
    currentTrack,
    queue,
    currentIndex,
    nowPlayingContext,
    isPlaying,
    position,
    duration,
    shuffle,
    repeatMode,
    playlists,
    likedIds,
    waveformSamples,
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
  const artworkSource = activeTrack?.imageUrl
    ? { uri: activeTrack.imageUrl }
    : PLACEHOLDER_ART;

  const queueItems = useMemo<QueueListItem[]>(
    () => playbackQueue.map((track, index) => ({ key: `${track.id}-${index}`, track })),
    [playbackQueue]
  );

  const selectedQueueTrack = selectedQueueIndex !== null ? playbackQueue[selectedQueueIndex] ?? null : null;
  const sourceLabel =
    nowPlayingContext?.type === 'playlist'
      ? 'Playlist'
      : nowPlayingContext?.type === 'liked'
        ? 'Liked'
        : nowPlayingContext?.type === 'jiosaavn'
          ? 'JioSaavn'
          : nowPlayingContext?.type === 'remote'
            ? 'Direct Stream'
            : 'Library';

  const currentFilename = activeTrack?.filename || '';
  const currentUri = activeTrack?.uri || '';
  const isVideoTrack =
    /\.(mp4|m4v|mov|webm|m3u8)(\?.*)?$/i.test(currentFilename) ||
    /\.(mp4|m4v|mov|webm|m3u8)(\?.*)?$/i.test(currentUri);

  const videoPlayer = useVideoPlayer(isVideoTrack && activeTrack ? activeTrack.uri : null, (player) => {
    player.muted = true;
    player.loop = false;
    player.showNowPlayingNotification = false;
    player.staysActiveInBackground = false;
    player.play();
  });

  useEffect(() => {
    if (!activeTrack) {
      return;
    }

    pulse.stopAnimation();

    if (isPlaying && !isVideoTrack) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.05,
            duration: 2200,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 2200,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();

      return () => {
        animation.stop();
      };
    }

    Animated.spring(pulse, {
      toValue: 1,
      friction: 7,
      tension: 70,
      useNativeDriver: true,
    }).start();
  }, [activeTrack, isPlaying, isVideoTrack, pulse]);

  useEffect(() => {
    if (!isVideoTrack || !activeTrack) {
      videoPlayer.pause();
      return;
    }

    if (Math.abs(videoPlayer.currentTime - position) > 0.8) {
      videoPlayer.currentTime = position;
    }

    if (isPlaying) {
      videoPlayer.play();
    } else {
      videoPlayer.pause();
    }
  }, [activeTrack, activeTrack?.id, isPlaying, isVideoTrack, position, videoPlayer]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  const liked = activeTrack ? likedIds.has(activeTrack.id) : false;

  const openQueueActions = useCallback((index: number) => {
    Haptics.selectionAsync();
    setSelectedQueueIndex(index);
    setIsQueueActionVisible(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!activeTrack) {
      return;
    }

    setDeleteConfirmVisible(false);
    const success = await deleteSong(activeTrack);
    if (success) {
      router.back();
      return;
    }

    setNoticeState({
      visible: true,
      title: 'Delete Failed',
      message: 'Could not delete this file from your device.',
    });
  }, [activeTrack, deleteSong, router]);

  const onSeekComplete = useCallback(async (seconds: number) => {
    await seekTo(seconds);
    if (isVideoTrack) {
      videoPlayer.currentTime = seconds;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSlidingValue(seconds);
    setIsSliding(false);
  }, [isVideoTrack, seekTo, videoPlayer]);

  const onToggleRepeat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  }, [repeatMode, setRepeatMode]);

  const handleQueueAction = useCallback(async (
    action: 'play' | 'next' | 'end' | 'remove'
  ) => {
    if (selectedQueueIndex === null || !selectedQueueTrack) {
      return;
    }

    setIsQueueActionVisible(false);

    if (action === 'play') {
      await selectQueueItem(selectedQueueIndex);
      return;
    }

    if (action === 'remove') {
      await removeQueueItem(selectedQueueIndex);
      return;
    }

    await enqueueTracks([selectedQueueTrack], action === 'next' ? 'next' : 'end');
  }, [enqueueTracks, removeQueueItem, selectQueueItem, selectedQueueIndex, selectedQueueTrack]);

  const renderQueueItem = useCallback(({ item, drag, getIndex, isActive }: any) => {
    const queueIndex = getIndex?.() ?? 0;
    const track = item.track;
    const isCurrent = queueIndex === currentIndex;

    return (
      <View
        style={[
          styles.queueRow,
          {
            borderColor: isCurrent ? accent : colors.cardBorder,
            backgroundColor: isCurrent ? withAlpha(accent, 0.14) : colors.cardBackground,
            opacity: isActive ? 0.92 : 1,
          },
        ]}
      >
        <ScalePressable style={styles.queueMainTap} onPress={() => void selectQueueItem(queueIndex)}>
          <View style={styles.queueThumbWrap}>
            <Image
              source={track.imageUrl ? { uri: track.imageUrl } : PLACEHOLDER_ART}
              style={styles.queueThumb}
            />
            {isCurrent ? (
              <View style={[styles.queuePlayingOverlay, { backgroundColor: withAlpha(CORE_COLORS.black, 0.35) }]}>
                <Ionicons name="volume-high" size={16} color={colors.onAccent} />
              </View>
            ) : null}
          </View>

          <View style={styles.queueMetaWrap}>
            <Text numberOfLines={1} style={[styles.queueSongName, { color: isCurrent ? accent : colors.text }]}>
              {track.title || track.filename}
            </Text>
            <Text numberOfLines={1} style={[styles.queueArtists, { color: colors.textMuted }]}>
              {track.artist || track.artists || 'Unknown Artist'}
            </Text>
          </View>

          <View style={styles.queueRightWrap}>
            {track.duration > 0 ? (
              <Text style={[styles.queueDuration, { color: colors.textMuted }]}>
                {formatTime(track.duration)}
              </Text>
            ) : null}
          </View>
        </ScalePressable>

        <View style={styles.queueActions}>
          <ScalePressable style={styles.queueActionBtn} onLongPress={drag} onPressIn={() => Haptics.selectionAsync()}>
            <Ionicons name="reorder-three-outline" size={20} color={colors.textMuted} />
          </ScalePressable>
          <ScalePressable style={styles.queueActionBtn} onPress={() => openQueueActions(queueIndex)}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
          </ScalePressable>
        </View>
      </View>
    );
  }, [accent, colors.cardBackground, colors.cardBorder, colors.onAccent, colors.text, colors.textMuted, currentIndex, formatTime, openQueueActions, selectQueueItem, styles.queueActionBtn, styles.queueActions, styles.queueArtists, styles.queueDuration, styles.queueMainTap, styles.queueMetaWrap, styles.queuePlayingOverlay, styles.queueRightWrap, styles.queueRow, styles.queueSongName, styles.queueThumb, styles.queueThumbWrap]);

  if (!activeTrack) {
    return (
      <View style={[styles.container, { backgroundColor: colors.screenBackground }]}>
        <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
        <View style={[styles.emptyWrap, { paddingTop: insets.top + 24 }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No track is playing</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Start a song from Library, Search, or Playlist.
          </Text>
          <ScalePressable
            style={[styles.emptyBtn, { borderColor: colors.iconButtonBorder, backgroundColor: colors.iconButtonBackground }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
            <Text style={[styles.emptyBtnText, { color: colors.text }]}>Go Back</Text>
          </ScalePressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.screenBackground }]}>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />

      {activeTrack.imageUrl ? (
        <AnimatedImage
          source={{ uri: activeTrack.imageUrl }}
          blurRadius={72}
          style={[
            styles.backdropArt,
            {
              opacity: isVideoTrack ? 0.12 : 0.28,
              transform: [{ scale: pulse }],
            },
          ]}
        />
      ) : null}
      <View style={[styles.backdropTint, { backgroundColor: withAlpha(accent, 0.18) }]} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 124 }}
        showsVerticalScrollIndicator={false}
      >
        <BlurView
          intensity={45}
          tint={resolvedTheme === 'dark' ? 'dark' : 'light'}
          style={[styles.headerGlass, { paddingTop: insets.top + 8, borderColor: colors.cardBorder }]}
        >
          <ScalePressable
            style={[styles.iconBtn, { borderColor: colors.iconButtonBorder, backgroundColor: withAlpha(colors.cardBackground, 0.65) }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-down" size={22} color={colors.text} />
          </ScalePressable>

          <View style={styles.headerCenter}>
            <Text numberOfLines={1} style={[styles.headerEyebrow, { color: accent }]}>
              {sourceLabel}
            </Text>
            <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.text }]}>
              {nowPlayingContext?.title || 'Now Playing'}
            </Text>
          </View>

          <ScalePressable
            style={[styles.iconBtn, { borderColor: colors.iconButtonBorder, backgroundColor: withAlpha(colors.cardBackground, 0.65) }]}
            onPress={() => setIsActionVisible(true)}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
          </ScalePressable>
        </BlurView>

        <View style={[styles.heroGlow, { backgroundColor: withAlpha(accent, 0.28), transform: [{ scale: pulse }] }]} />

        <View style={[styles.artworkWrap, { borderColor: withAlpha(accent, 0.32), backgroundColor: withAlpha(colors.cardBackground, 0.74) }]}>
          {isVideoTrack ? (
            <VideoView
              style={[styles.artwork, { width: artSize, height: artSize }]}
              player={videoPlayer}
              nativeControls={false}
              contentFit="cover"
            />
          ) : (
            <AnimatedImage
              source={artworkSource}
              style={[
                styles.artwork,
                {
                  width: artSize,
                  height: artSize,
                  transform: [{ scale: pulse }],
                },
              ]}
            />
          )}
        </View>

        <View style={styles.songBlock}>
          <View style={styles.songTitleRow}>
            <View style={styles.currentSongInfo}>
                <Text numberOfLines={1} style={[styles.songTitle, { color: colors.text }]}>
                {activeTrack.title || activeTrack.filename}
              </Text>
              <Text numberOfLines={1} style={[styles.songSub, { color: colors.textMuted }]}>
                {activeTrack.artist || activeTrack.artists || 'Unknown Artist'}
              </Text>

              <View style={styles.metaPills}>
                <View style={[styles.metaPill, { backgroundColor: withAlpha(accent, 0.14) }]}>
                  <Text style={[styles.metaPillText, { color: accent }]}>{sourceLabel}</Text>
                </View>
                {isVideoTrack ? (
                  <View style={[styles.metaPill, { backgroundColor: withAlpha(colors.textMuted, 0.14) }]}>
                    <Text style={[styles.metaPillText, { color: colors.textMuted }]}>Video</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <ScalePressable
              style={[styles.likeBtn, { backgroundColor: colors.likeButtonBackground, borderColor: liked ? accent : colors.mainControlBorder }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleLike(activeTrack.id);
              }}
            >
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? accent : colors.text} />
            </ScalePressable>
          </View>

          <View style={styles.waveformWrap}>
            <WaveformSeekbar
              samples={waveformSamples}
              progressSeconds={isSliding ? slidingValue : position}
              durationSeconds={Math.max(duration, 1)}
              activeColor={accent}
              inactiveColor={withAlpha(colors.textMuted, 0.24)}
              scrubberColor={colors.text}
              onSeekStart={() => {
                Haptics.selectionAsync();
                setIsSliding(true);
                setSlidingValue(position);
              }}
              onSeekPreview={(seconds) => {
                setSlidingValue(seconds);
              }}
              onSeekComplete={onSeekComplete}
            />

            <View style={styles.timeRow}>
              <Text style={[styles.timeText, { color: colors.textMuted }]}>
                {formatTime(isSliding ? slidingValue : position)}
              </Text>
              <Text style={[styles.timeText, { color: colors.textMuted }]}>
                -{formatTime(Math.max(0, duration - (isSliding ? slidingValue : position)))}
              </Text>
            </View>
          </View>

          <View style={styles.controlRow}>
            <ScalePressable style={styles.smallControl} onPress={() => setShuffle(!shuffle)}>
              <Ionicons name="shuffle" size={22} color={shuffle ? accent : colors.textMuted} />
            </ScalePressable>

            <ScalePressable
              style={[styles.mainControl, { backgroundColor: colors.mainControlBackground, borderColor: colors.mainControlBorder }]}
              onPress={handlePrevious}
            >
              <Ionicons name="play-skip-back" size={24} color={colors.text} />
            </ScalePressable>

            <ScalePressable
              style={[styles.playControl, { backgroundColor: accent }]}
              onPress={handlePlayPause}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={32}
                color={colors.onAccent}
              />
            </ScalePressable>

            <ScalePressable
              style={[styles.mainControl, { backgroundColor: colors.mainControlBackground, borderColor: colors.mainControlBorder }]}
              onPress={handleNext}
            >
              <Ionicons name="play-skip-forward" size={24} color={colors.text} />
            </ScalePressable>

            <ScalePressable style={styles.smallControl} onPress={onToggleRepeat}>
              <View>
                <Ionicons name="repeat" size={22} color={repeatMode !== 'off' ? accent : colors.textMuted} />
                {repeatMode === 'one' ? <Text style={[styles.repeatOne, { color: accent }]}>1</Text> : null}
              </View>
            </ScalePressable>
          </View>
        </View>

        <BlurView
          intensity={50}
          tint={resolvedTheme === 'dark' ? 'dark' : 'light'}
          style={[styles.queueCard, { borderColor: withAlpha(accent, 0.22) }]}
        >
          <View style={styles.queueHeader}>
            <View>
              <Text style={[styles.queueHeaderText, { color: colors.text }]}>Queue ({playbackQueue.length})</Text>
              <Text style={[styles.queueHint, { color: colors.textMuted }]}>Drag to reorder. Tap for play. More actions on each row.</Text>
            </View>
            {nowPlayingContext?.playlistId ? (
              <ScalePressable onPress={() => safePush(`/playlist/${nowPlayingContext.playlistId}`)}>
                <Text style={[styles.openPlaylist, { color: accent }]}>Open Playlist</Text>
              </ScalePressable>
            ) : null}
          </View>

          <DraggableFlatList
            data={queueItems}
            keyExtractor={(item) => item.key}
            renderItem={renderQueueItem}
            scrollEnabled={false}
            activationDistance={16}
            onDragEnd={({ from, to }) => {
              if (from !== to) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                void moveQueueItem(from, to);
              }
            }}
            ListEmptyComponent={
              <View style={styles.emptyQueue}>
                <Ionicons name="list-outline" size={28} color={colors.textMuted} />
                <Text style={[styles.emptyQueueText, { color: colors.textMuted }]}>
                  The queue will appear here once playback starts.
                </Text>
              </View>
            }
          />
        </BlurView>
      </ScrollView>

      <AddToPlaylistModal
        visible={isAddPlaylistVisible}
        onClose={() => setIsAddPlaylistVisible(false)}
        playlists={playlists}
        onSelect={(playlistId: string) => {
          addToPlaylist(playlistId, activeTrack.id);
          setIsAddPlaylistVisible(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />

      <ActionDialog
        visible={isActionVisible}
        title={activeTrack.title || activeTrack.filename}
        subtitle={`${formatTime(activeTrack.duration)} · ${activeTrack.artist || activeTrack.artists || 'Unknown Artist'}`}
        imageSource={artworkSource}
        message="Manage this track"
        onClose={() => setIsActionVisible(false)}
        actions={[
          {
            key: 'playlist',
            label: 'Add to Playlist',
            icon: 'add-circle-outline',
            onPress: () => {
              setIsActionVisible(false);
              setIsAddPlaylistVisible(true);
            },
          },
          {
            key: 'share',
            label: 'Share',
            icon: 'share-social-outline',
            onPress: async () => {
              setIsActionVisible(false);
              try {
                await Share.share({
                  message: activeTrack.title || activeTrack.filename,
                  url: activeTrack.uri,
                });
              } catch {
                // Native share sheet failures are non-fatal.
              }
            },
          },
          {
            key: 'delete',
            label: 'Delete from Device',
            icon: 'trash-outline',
            danger: true,
            onPress: () => {
              setIsActionVisible(false);
              setDeleteConfirmVisible(true);
            },
          },
        ]}
      />

      <ActionDialog
        visible={isQueueActionVisible && Boolean(selectedQueueTrack)}
        title={selectedQueueTrack?.title || selectedQueueTrack?.filename || 'Queue Item'}
        subtitle={selectedQueueTrack ? `${formatTime(selectedQueueTrack.duration)} · ${selectedQueueTrack.artist || selectedQueueTrack.artists || 'Unknown Artist'}` : undefined}
        imageSource={selectedQueueTrack?.imageUrl ? { uri: selectedQueueTrack.imageUrl } : PLACEHOLDER_ART}
        message="Queue options"
        onClose={() => setIsQueueActionVisible(false)}
        actions={[
          {
            key: 'play',
            label: 'Play Now',
            icon: 'play-outline',
            onPress: () => { void handleQueueAction('play'); },
          },
          {
            key: 'next',
            label: 'Add to Next',
            icon: 'play-skip-forward-outline',
            onPress: () => { void handleQueueAction('next'); },
          },
          {
            key: 'end',
            label: 'Add to End',
            icon: 'play-forward-outline',
            onPress: () => { void handleQueueAction('end'); },
          },
          {
            key: 'remove',
            label: 'Remove from Queue',
            icon: 'remove-circle-outline',
            danger: true,
            onPress: () => { void handleQueueAction('remove'); },
          },
        ]}
      />

      <ConfirmDialog
        visible={isDeleteConfirmVisible}
        title="Delete Track"
        message="Permanently delete this track from the device?"
        onClose={() => setDeleteConfirmVisible(false)}
        onConfirm={handleDelete}
        confirmText="Delete"
        cancelText="Cancel"
        danger
      />

      <NoticeDialog
        visible={noticeState.visible}
        title={noticeState.title}
        message={noticeState.message}
        onClose={() => setNoticeState((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

function createStyles(colors: any, isSmall: boolean, isMedium: boolean, artSize: number, screenWidth: number) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    backdropArt: {
      ...StyleSheet.absoluteFillObject,
      width: screenWidth,
      height: '100%',
    },
    backdropTint: {
      ...StyleSheet.absoluteFillObject,
    },
    scroll: {
      flex: 1,
    },
    headerGlass: {
      marginHorizontal: isSmall ? 12 : 16,
      marginTop: 8,
      borderWidth: 1,
      borderRadius: isSmall ? 22 : 26,
      paddingHorizontal: isSmall ? 14 : 18,
      paddingBottom: 14,
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconBtn: {
      width: isSmall ? 42 : 46,
      height: isSmall ? 42 : 46,
      borderRadius: isSmall ? 14 : 16,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCenter: {
      flex: 1,
      marginHorizontal: 12,
    },
    headerEyebrow: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.1,
      textTransform: 'uppercase',
    },
    headerTitle: {
      fontSize: isSmall ? 14 : 16,
      fontWeight: '700',
      marginTop: 3,
    },
    heroGlow: {
      width: artSize + 76,
      height: artSize + 76,
      borderRadius: artSize,
      marginTop: 28,
      alignSelf: 'center',
      position: 'absolute',
      top: isSmall ? 110 : 122,
      opacity: 0.9,
    },
    artworkWrap: {
      marginTop: 34,
      marginHorizontal: isSmall ? 18 : 22,
      borderWidth: 1,
      borderRadius: isSmall ? 34 : 40,
      padding: isSmall ? 18 : 22,
      alignItems: 'center',
      shadowColor: CORE_COLORS.black,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.22,
      shadowRadius: 24,
      elevation: 10,
    },
    artwork: {
      borderRadius: isSmall ? 22 : 28,
    },
    songBlock: {
      marginTop: 22,
      paddingHorizontal: isSmall ? 16 : 20,
    },
    songTitleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    currentSongInfo: {
      flex: 1,
      marginRight: 12,
    },
    songTitle: {
      fontSize: isSmall ? 24 : 28,
      fontWeight: '900',
      letterSpacing: -0.6,
    },
    songSub: {
      marginTop: 6,
      fontSize: isSmall ? 14 : 15,
      fontWeight: '600',
    },
    metaPills: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    metaPill: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
    },
    metaPillText: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    likeBtn: {
      width: isSmall ? 44 : 48,
      height: isSmall ? 44 : 48,
      borderRadius: isSmall ? 16 : 18,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    waveformWrap: {
      marginTop: 22,
    },
    timeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    timeText: {
      fontSize: isSmall ? 11 : 12,
      fontWeight: '700',
    },
    controlRow: {
      marginTop: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    smallControl: {
      width: isSmall ? 38 : 42,
      height: isSmall ? 38 : 42,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mainControl: {
      width: isSmall ? 48 : 54,
      height: isSmall ? 48 : 54,
      borderRadius: isSmall ? 16 : 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    playControl: {
      width: isSmall ? 66 : 74,
      height: isSmall ? 66 : 74,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: CORE_COLORS.black,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.22,
      shadowRadius: 20,
      elevation: 8,
    },
    repeatOne: {
      position: 'absolute',
      right: -7,
      top: -7,
      fontSize: 10,
      fontWeight: '900',
    },
    queueCard: {
      marginTop: 26,
      marginHorizontal: isSmall ? 12 : 16,
      borderRadius: isSmall ? 26 : 30,
      borderWidth: 1,
      padding: isSmall ? 14 : 18,
      overflow: 'hidden',
    },
    queueHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 14,
      alignItems: 'flex-start',
    },
    queueHeaderText: {
      fontSize: isSmall ? 15 : 16,
      fontWeight: '800',
    },
    queueHint: {
      marginTop: 4,
      fontSize: isSmall ? 11 : 12,
      fontWeight: '500',
      lineHeight: 18,
      maxWidth: isMedium ? screenWidth - 150 : screenWidth - 170,
    },
    openPlaylist: {
      fontSize: isSmall ? 12 : 13,
      fontWeight: '800',
      marginTop: 2,
    },
    queueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: isSmall ? 18 : 20,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
    },
    queueMainTap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    queueThumbWrap: {
      width: isSmall ? 44 : 50,
      height: isSmall ? 44 : 50,
      borderRadius: isSmall ? 12 : 14,
      overflow: 'hidden',
      marginRight: 12,
      backgroundColor: withAlpha(CORE_COLORS.black, 0.08),
    },
    queueThumb: {
      width: '100%',
      height: '100%',
    },
    queuePlayingOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
    },
    queueMetaWrap: {
      flex: 1,
      marginRight: 10,
    },
    queueSongName: {
      fontSize: isSmall ? 14 : 15,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    queueArtists: {
      fontSize: isSmall ? 11 : 12,
      fontWeight: '500',
      marginTop: 3,
    },
    queueRightWrap: {
      justifyContent: 'center',
      minWidth: 44,
      alignItems: 'flex-end',
    },
    queueDuration: {
      fontSize: isSmall ? 11 : 12,
      fontWeight: '700',
    },
    queueActions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 8,
    },
    queueActionBtn: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyQueue: {
      alignItems: 'center',
      paddingVertical: 24,
      gap: 10,
    },
    emptyQueueText: {
      fontSize: 13,
      fontWeight: '500',
      textAlign: 'center',
    },
    emptyWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: isSmall ? 16 : 24,
    },
    emptyTitle: {
      fontSize: isSmall ? 18 : 22,
      fontWeight: '800',
    },
    emptyText: {
      fontSize: isSmall ? 13 : 14,
      fontWeight: '500',
      marginTop: 8,
      textAlign: 'center',
    },
    emptyBtn: {
      marginTop: 18,
      borderWidth: 1,
      borderRadius: isSmall ? 12 : 14,
      paddingHorizontal: 16,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    emptyBtnText: {
      fontSize: isSmall ? 13 : 14,
      fontWeight: '700',
    },
  });
}
