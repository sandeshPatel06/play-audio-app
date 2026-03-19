import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import { ActionDialog, ConfirmDialog, NoticeDialog } from '../components/AppDialogs';
import PaginationControls from '../components/PaginationControls';
import ScalePressable from '../components/ScalePressable';
import { useTheme } from '../context/ThemeContext';
import { useAudio } from '../hooks/useAudio';
import { useSafeRouterPush } from '../hooks/useSafeRouterPush';

const { width } = Dimensions.get('window');
const ART_SIZE = Math.min(width - 72, 320);
const SONGS_PER_PAGE = 20;

export default function FullPlayerScreen() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { colors, resolvedTheme } = useTheme();
  const router = useRouter();
  const safePush = useSafeRouterPush();

  const [isActionVisible, setIsActionVisible] = useState(false);
  const [isDeleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [isAddPlaylistVisible, setIsAddPlaylistVisible] = useState(false);
  const [queuePage, setQueuePage] = useState(1);
  const [noticeState, setNoticeState] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  const {
    currentSong,
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
    handlePlayPause,
    handleNext,
    handlePrevious,
    seekTo,
    setShuffle,
    setRepeatMode,
    startQueuePlayback,
    addToPlaylist,
    deleteSong,
    toggleLike,
  } = useAudio();

  const queueTypeLabel =
    nowPlayingContext?.type === 'playlist'
      ? 'Playlist'
      : nowPlayingContext?.type === 'liked'
        ? 'Liked Songs'
        : nowPlayingContext?.type === 'remote'
          ? 'Link Stream'
          : 'Library';

  const queueTitle = nowPlayingContext?.title || 'Queue';

  const currentFilename = currentSong?.filename || '';
  const currentUri = currentSong?.uri || '';
  const isVideoTrack =
    /\.(mp4|m4v|mov|webm|m3u8)(\?.*)?$/i.test(currentFilename) ||
    /\.(mp4|m4v|mov|webm|m3u8)(\?.*)?$/i.test(currentUri);

  const videoPlayer = useVideoPlayer(isVideoTrack && currentSong ? currentSong.uri : null, (player) => {
    player.muted = true;
    player.loop = false;
    player.showNowPlayingNotification = false;
    player.staysActiveInBackground = false;
  });

  useEffect(() => {
    if (!isVideoTrack || !currentSong) {
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
  }, [currentSong?.id, currentSong, isVideoTrack, isPlaying, position, videoPlayer]);

  const totalQueuePages = Math.max(1, Math.ceil(queue.length / SONGS_PER_PAGE));
  const pagedQueue = useMemo(() => {
    const start = (queuePage - 1) * SONGS_PER_PAGE;
    return queue.slice(start, start + SONGS_PER_PAGE);
  }, [queue, queuePage]);

  useEffect(() => {
    if (currentIndex < 0) return;
    const pageFromIndex = Math.floor(currentIndex / SONGS_PER_PAGE) + 1;
    setQueuePage((prev) => (prev === pageFromIndex ? prev : pageFromIndex));
  }, [currentIndex]);

  useEffect(() => {
    if (queuePage > totalQueuePages) {
      setQueuePage(totalQueuePages);
    }
  }, [queuePage, totalQueuePages]);

  if (!currentSong) {
    return (
      <View style={[styles.container, { backgroundColor: colors.screenBackground }]}>
        <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
        <View style={[styles.emptyWrap, { paddingTop: insets.top + 24 }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No track is playing</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Start a song from Library, Search, or Playlist.</Text>
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

  const liked = likedIds.includes(currentSong.id);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const remaining = Math.max(duration - position, 0);

  const handleDelete = async () => {
    setDeleteConfirmVisible(false);
    const success = await deleteSong(currentSong);
    if (success) {
      router.back();
      return;
    }

    setNoticeState({
      visible: true,
      title: 'Error',
      message: 'Failed to delete song',
    });
  };

  const onSeekComplete = async (seconds: number) => {
    await seekTo(seconds);
    if (isVideoTrack) {
      videoPlayer.currentTime = seconds;
    }
  };

  const onToggleRepeat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.screenBackground }]}
    >
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <ScalePressable style={[styles.iconBtn, { borderColor: colors.iconButtonBorder, backgroundColor: colors.iconButtonBackground }]} onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={22} color={colors.text} />
        </ScalePressable>

        <View style={styles.headerCenter}>
          <Text numberOfLines={1} style={[styles.headerEyebrow, { color: colors.textMuted }]}>{queueTypeLabel}</Text>
          <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.text }]}>{queueTitle}</Text>
        </View>

        <ScalePressable
          style={[styles.iconBtn, { borderColor: colors.iconButtonBorder, backgroundColor: colors.iconButtonBackground }]}
          onPress={() => setIsActionVisible(true)}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
        </ScalePressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 124 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.artworkWrap, { borderColor: colors.cardBorder, backgroundColor: colors.artworkBackground }]}>
          {isVideoTrack ? (
            <VideoView
              style={[styles.artwork, { width: ART_SIZE, height: ART_SIZE }]}
              player={videoPlayer}
              nativeControls={false}
              contentFit="cover"
            />
          ) : (
            <Image
              source={require('../assets/images/placeholder.png')}
              style={[styles.artwork, { width: ART_SIZE, height: ART_SIZE }]}
            />
          )}
        </View>

        <View style={styles.songBlock}>
          <View style={styles.songTitleRow}>
                <View style={[styles.currentSongInfo, { opacity: isVideoTrack ? 0.3 : 1 }]}>
                  <Text numberOfLines={1} style={[styles.songTitle, { color: colors.text }]}>{currentSong.filename}</Text>
                  <Text numberOfLines={1} style={[styles.songSub, { color: colors.mutedText, marginTop: 4 }]}>
                    Unknown Artist
                  </Text>
                </View>
            <ScalePressable
              style={[styles.likeBtn, { backgroundColor: colors.likeButtonBackground, borderColor: liked ? colors.accentBorder : colors.mainControlBorder }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleLike(currentSong.id);
              }}
            >
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? colors.accent : colors.text} />
            </ScalePressable>
          </View>

          <View style={styles.sliderWrap}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={Math.max(duration, 1)}
              value={position}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor={colors.sliderTrack}
              thumbTintColor={colors.text}
              onSlidingComplete={onSeekComplete}
            />
            <View style={styles.timeRow}>
              <Text style={[styles.timeText, { color: colors.mutedText }]}>{formatTime(position)}</Text>
              <Text style={[styles.timeText, { color: colors.mutedText }]}>-{formatTime(remaining)}</Text>
            </View>
          </View>

          <View style={styles.controlRow}>
            <ScalePressable style={styles.smallControl} onPress={() => setShuffle(!shuffle)}>
              <Ionicons name="shuffle" size={22} color={shuffle ? colors.accent : colors.mutedIcon} />
            </ScalePressable>
            <ScalePressable style={[styles.mainControl, { backgroundColor: colors.mainControlBackground, borderColor: colors.mainControlBorder }]} onPress={handlePrevious}>
              <Ionicons name="play-skip-back" size={24} color={colors.text} />
            </ScalePressable>
            <ScalePressable style={[styles.playControl, { backgroundColor: colors.accent }]} onPress={handlePlayPause}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={30} color={colors.onAccent} />
            </ScalePressable>
            <ScalePressable style={[styles.mainControl, { backgroundColor: colors.mainControlBackground, borderColor: colors.mainControlBorder }]} onPress={handleNext}>
              <Ionicons name="play-skip-forward" size={24} color={colors.text} />
            </ScalePressable>
            <ScalePressable style={styles.smallControl} onPress={onToggleRepeat}>
              <View>
                <Ionicons name="repeat" size={22} color={repeatMode !== 'off' ? colors.accent : colors.mutedIcon} />
                {repeatMode === 'one' ? <Text style={[styles.repeatOne, { color: colors.accent }]}>1</Text> : null}
              </View>
            </ScalePressable>
          </View>
        </View>

        <View style={[styles.queueCard, { borderColor: colors.queueCardBorder, backgroundColor: colors.queueCardBackground }]}>
          <View style={styles.queueHeader}>
            <Text style={[styles.queueHeaderText, { color: colors.text }]}>Up Next ({queue.length})</Text>
            {nowPlayingContext?.playlistId ? (
              <TouchableOpacity onPress={() => safePush(`/playlist/${nowPlayingContext.playlistId}`)}>
                <Text style={[styles.openPlaylist, { color: colors.accent }]}>Open Playlist</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {pagedQueue.map((song, index) => {
            const actualIndex = (queuePage - 1) * SONGS_PER_PAGE + index;
            const isCurrent = actualIndex === currentIndex;
            return (
              <TouchableOpacity
                key={`${song.id}-${actualIndex}`}
                style={[styles.queueRow, isCurrent && { borderColor: colors.accent, backgroundColor: colors.activeRowBackground }]}
                onPress={() => startQueuePlayback(queue, actualIndex, nowPlayingContext)}
              >
                <Text style={[styles.queueIndex, { color: isCurrent ? colors.accent : colors.mutedIcon }]}>{actualIndex + 1}</Text>
                <View style={styles.queueMetaWrap}>
                  <Text numberOfLines={1} style={[styles.queueSongName, { color: isCurrent ? colors.accent : colors.text }]}>{song.filename}</Text>
                  <Text style={[styles.queueDuration, { color: colors.mutedIcon }]}>{Math.floor(song.duration / 60)}:{(song.duration % 60).toFixed(0).padStart(2, '0')}</Text>
                </View>
                {isCurrent ? <Ionicons name="musical-note" size={15} color={colors.accent} /> : null}
              </TouchableOpacity>
            );
          })}
          {queue.length > 0 ? (
            <PaginationControls
              currentPage={queuePage}
              totalPages={totalQueuePages}
              onPrev={() => setQueuePage((prev) => Math.max(1, prev - 1))}
              onNext={() => setQueuePage((prev) => Math.min(totalQueuePages, prev + 1))}
              colors={colors}
            />
          ) : null}
        </View>
      </ScrollView>

      <AddToPlaylistModal
        visible={isAddPlaylistVisible}
        onClose={() => setIsAddPlaylistVisible(false)}
        playlists={playlists}
        onSelect={(playlistId: string) => {
          addToPlaylist(playlistId, currentSong.id);
          setIsAddPlaylistVisible(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />

      <ActionDialog
        visible={isActionVisible}
        title={currentSong.filename}
        subtitle={`${Math.floor(currentSong.duration / 60)}:${(currentSong.duration % 60).toFixed(0).padStart(2, '0')}`}
        imageSource={require('../assets/images/placeholder.png')}
        message="Manage this song"
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
                  message: currentSong.filename,
                  url: currentSong.uri,
                });
              } catch {}
            },
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: 'trash-outline',
            danger: true,
            onPress: () => {
              setIsActionVisible(false);
              setDeleteConfirmVisible(true);
            },
          },
        ]}
      />

      <ConfirmDialog
        visible={isDeleteConfirmVisible}
        title="Delete Song"
        message="Are you sure you want to permanently delete this song?"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  artworkWrap: {
    marginHorizontal: 20,
    borderWidth: 1,
    borderRadius: 30,
    padding: 16,
    alignItems: 'center',
  },
  artwork: {
    borderRadius: 20,
  },
  songBlock: {
    marginTop: 18,
    paddingHorizontal: 20,
  },
  songTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  songMetaWrap: {
    flex: 1,
    marginRight: 10,
  },
  songTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  songSub: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  likeBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderWrap: {
    marginTop: 16,
  },
  slider: {
    width: '100%',
    height: 40,
    marginLeft: -14,
    marginRight: -14,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -6,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  controlRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smallControl: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainControl: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  playControl: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatOne: {
    position: 'absolute',
    right: -7,
    top: -7,
    fontSize: 10,
    fontWeight: '800',
  },
  queueCard: {
    marginTop: 22,
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  queueHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  openPlaylist: {
    fontSize: 12,
    fontWeight: '700',
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  queueIndex: {
    width: 24,
    fontSize: 12,
    fontWeight: '700',
  },
  queueMetaWrap: {
    flex: 1,
    marginRight: 8,
  },
  queueSongName: {
    fontSize: 13,
    fontWeight: '700',
  },
  queueDuration: {
    marginTop: 2,
    fontSize: 11,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
