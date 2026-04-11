import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { audioRuntimeController } from '../services/audioRuntimeController';
import { mediaAssetToTrack, normalizeTrack } from '../services/audioTracks';
import {
    AudioTrack,
    DeleteTracksResult,
    NowPlayingContext,
    getLikedTracks,
    getPlaylistTracks,
    selectQueueTracks,
    useAudioStore,
} from '../store/useAudioStore';

type LegacyAudioItem = MediaLibrary.Asset & Record<string, any>;

type CompatPlaylist = ReturnType<typeof useAudioStore.getState>['playlists'][number] & {
    assetIds: string[];
};

const inferLegacyMediaType = (item: LegacyAudioItem): AudioTrack['mediaType'] => {
    const mediaType = String(item.mediaType || '').toLowerCase();
    if (
        mediaType.includes('video') ||
        /\.(mp4|m4v|mov|webm|m3u8)(\?.*)?$/i.test(`${item.filename || ''} ${item.uri || ''}`)
    ) {
        return 'video';
    }
    return 'audio';
};

const isAudioTrack = (item: LegacyAudioItem | AudioTrack): item is AudioTrack =>
    typeof (item as AudioTrack).source === 'string';

const coerceTrack = (item: LegacyAudioItem | AudioTrack) => {
    if (isAudioTrack(item)) {
        return normalizeTrack(item);
    }

    if (String(item.id || '').startsWith('jiosaavn:')) {
        return normalizeTrack({
            id: String(item.id),
            uri: String(item.uri),
            source: 'jiosaavn',
            filename: String(item.filename || item.title || 'Track'),
            title: String(item.title || item.filename || 'Track'),
            artist: String(item.artist || item.artists || 'Unknown Artist'),
            artists: String(item.artists || item.artist || 'Unknown Artist'),
            album: String(item.album || 'Saavn'),
            imageUrl: item.imageUrl,
            duration: Number(item.duration || 0),
            mediaType: inferLegacyMediaType(item),
            creationTime: Number(item.creationTime || Date.now()),
            modificationTime: Number(item.modificationTime || item.creationTime || Date.now()),
            isLocal: false,
            permaUrl: item.permaUrl,
            year: item.year,
            language: item.language,
        });
    }

    if (String(item.id || '').startsWith('remote:')) {
        return normalizeTrack({
            id: String(item.id),
            uri: String(item.uri),
            source: 'remote',
            filename: String(item.filename || item.title || 'Stream'),
            title: String(item.title || item.filename || 'Stream'),
            artist: String(item.artist || item.artists || 'Unknown Artist'),
            artists: String(item.artists || item.artist || 'Unknown Artist'),
            album: String(item.album || 'Direct Stream'),
            imageUrl: item.imageUrl,
            duration: Number(item.duration || 0),
            mediaType: inferLegacyMediaType(item),
            creationTime: Number(item.creationTime || Date.now()),
            modificationTime: Number(item.modificationTime || item.creationTime || Date.now()),
            isLocal: false,
        });
    }

    return mediaAssetToTrack(item);
};

export const useAudioPlayer = () => {
    const currentTrack = useAudioStore((state) => state.currentTrack);
    const nowPlayingContext = useAudioStore((state) => state.nowPlayingContext);
    const isPlaying = useAudioStore((state) => state.isPlaying);
    const isBuffering = useAudioStore((state) => state.isBuffering);
    const playbackStatus = useAudioStore((state) => state.playbackStatus);
    const playbackError = useAudioStore((state) => state.playbackError);
    const position = useAudioStore((state) => state.position);
    const duration = useAudioStore((state) => state.duration);
    const waveformSamples = useAudioStore((state) => state.waveformSamples);
    const adaptiveAccent = useAudioStore((state) => state.adaptiveAccent);
    const playbackRate = useAudioStore((state) => state.playbackRate);
    const setPlaybackRate = useAudioStore((state) => state.setPlaybackRate);

    const playPause = useCallback(() => audioRuntimeController.playPause(), []);
    const next = useCallback(() => audioRuntimeController.next(), []);
    const previous = useCallback(() => audioRuntimeController.previous(), []);
    const seekTo = useCallback((seconds: number) => audioRuntimeController.seekTo(seconds), []);
    const clearPlaybackError = useCallback(() => useAudioStore.getState().setPlaybackError(null), []);

    return {
        currentTrack,
        nowPlayingContext,
        isPlaying,
        isBuffering,
        playbackStatus,
        playbackError,
        position,
        duration,
        waveformSamples,
        adaptiveAccent,
        playbackRate,
        setPlaybackRate,
        playPause,
        next,
        previous,
        seekTo,
        clearPlaybackError,
    };
};

export const usePlaybackQueue = () => {
    const queue = useAudioStore(useShallow(selectQueueTracks));
    const currentIndex = useAudioStore((state) => state.currentIndex);
    const shuffle = useAudioStore((state) => state.shuffle);
    const repeatMode = useAudioStore((state) => state.repeatMode);
    const setShuffle = useAudioStore((state) => state.setShuffle);
    const setRepeatMode = useAudioStore((state) => state.setRepeatMode);

    const selectQueueItem = useCallback((index: number) => audioRuntimeController.selectQueueItem(index), []);
    const enqueueTracks = useCallback((tracks: AudioTrack[], position: 'next' | 'end') =>
        audioRuntimeController.enqueueTracks(tracks, position), []);
    const moveQueueItem = useCallback((from: number, to: number) =>
        audioRuntimeController.moveQueueItem(from, to), []);
    const removeQueueItem = useCallback((index: number) =>
        audioRuntimeController.removeQueueItem(index), []);

    return {
        queue,
        currentIndex,
        shuffle,
        repeatMode,
        setShuffle,
        setRepeatMode,
        selectQueueItem,
        enqueueTracks,
        moveQueueItem,
        removeQueueItem,
    };
};

export const useAudioPreferences = () => {
    const autoOpenPlayerOnPlay = useAudioStore((state) => state.autoOpenPlayerOnPlay);
    const showVideoBadges = useAudioStore((state) => state.showVideoBadges);
    const enableLockScreenControls = useAudioStore((state) => state.enableLockScreenControls);
    const onlineSourceEnabled = useAudioStore((state) => state.onlineSourceEnabled);
    const onlineSourcePreference = useAudioStore((state) => state.onlineSourcePreference);
    const gaplessPlaybackEnabled = useAudioStore((state) => state.gaplessPlaybackEnabled);
    const crossfadeEnabled = useAudioStore((state) => state.crossfadeEnabled);
    const crossfadeDurationSec = useAudioStore((state) => state.crossfadeDurationSec);
    const sleepTimer = useAudioStore((state) => state.sleepTimer);

    return {
        autoOpenPlayerOnPlay,
        showVideoBadges,
        enableLockScreenControls,
        onlineSourceEnabled,
        onlineSourcePreference,
        gaplessPlaybackEnabled,
        crossfadeEnabled,
        crossfadeDurationSec,
        sleepTimer,
        setAutoOpenPlayerOnPlay: useAudioStore((state) => state.setAutoOpenPlayerOnPlay),
        setShowVideoBadges: useAudioStore((state) => state.setShowVideoBadges),
        setEnableLockScreenControls: useAudioStore((state) => state.setEnableLockScreenControls),
        setOnlineSourceEnabled: useAudioStore((state) => state.setOnlineSourceEnabled),
        setOnlineSourcePreference: useAudioStore((state) => state.setOnlineSourcePreference),
        setGaplessPlaybackEnabled: useAudioStore((state) => state.setGaplessPlaybackEnabled),
        setCrossfadeEnabled: useAudioStore((state) => state.setCrossfadeEnabled),
        setCrossfadeDurationSec: useAudioStore((state) => state.setCrossfadeDurationSec),
        setSleepTimer: useAudioStore((state) => state.setSleepTimer),
        cancelSleepTimer: useAudioStore((state) => state.cancelSleepTimer),
    };
};

export const useLibraryActions = () => {
    const permissionGranted = useAudioStore((state) => state.permissionGranted);
    const libraryScanStatus = useAudioStore((state) => state.libraryScanStatus);
    const library = useAudioStore((state) => state.library);
    const setPermissionGranted = useAudioStore((state) => state.setPermissionGranted);
    const setCurrentIndex = useAudioStore((state) => state.setCurrentIndex);

    const refreshLibrary = useCallback(() => audioRuntimeController.refreshLibrary(), []);
    const deleteSong = useCallback((track: LegacyAudioItem | AudioTrack) =>
        audioRuntimeController.deleteTrack(coerceTrack(track)), []);
    const deleteSongs = useCallback((tracks: (LegacyAudioItem | AudioTrack)[]): Promise<DeleteTracksResult> =>
        audioRuntimeController.deleteTracks(tracks.map(coerceTrack)), []);
    const playFromUrl = useCallback((url: string) => audioRuntimeController.playFromUrl(url), []);

    return {
        permissionGranted,
        libraryScanStatus,
        library,
        setPermissionGranted,
        setCurrentIndex,
        refreshLibrary,
        deleteSong,
        deleteSongs,
        playFromUrl,
    };
};

export const useAudio = () => {
    const library = useAudioStore((state) => state.library);
    const currentTrack = useAudioStore((state) => state.currentTrack);
    const queue = useAudioStore(useShallow(selectQueueTracks));
    const currentIndex = useAudioStore((state) => state.currentIndex);
    const nowPlayingContext = useAudioStore((state) => state.nowPlayingContext);
    const playlistsRaw = useAudioStore((state) => state.playlists);
    const likedIdsRaw = useAudioStore((state) => state.likedIds);
    const toggleLikeStore = useAudioStore((state) => state.toggleLike);
    const createPlaylist = useAudioStore((state) => state.createPlaylist);
    const addToPlaylist = useAudioStore((state) => state.addToPlaylist);
    const deletePlaylist = useAudioStore((state) => state.deletePlaylist);
    const setCurrentIndex = useAudioStore((state) => state.setCurrentIndex);

    const {
        currentTrack: playerTrack,
        isPlaying,
        isBuffering,
        playbackStatus,
        playbackError,
        position,
        duration,
        waveformSamples,
        adaptiveAccent,
        playbackRate,
        setPlaybackRate,
        playPause,
        next,
        previous,
        seekTo,
        clearPlaybackError,
    } = useAudioPlayer();

    const {
        shuffle,
        repeatMode,
        setShuffle,
        setRepeatMode,
        selectQueueItem,
        enqueueTracks,
        moveQueueItem,
        removeQueueItem,
    } = usePlaybackQueue();

    const {
        autoOpenPlayerOnPlay,
        showVideoBadges,
        enableLockScreenControls,
        onlineSourceEnabled,
        onlineSourcePreference,
        gaplessPlaybackEnabled,
        crossfadeEnabled,
        crossfadeDurationSec,
        sleepTimer,
        setAutoOpenPlayerOnPlay,
        setShowVideoBadges,
        setEnableLockScreenControls,
        setOnlineSourceEnabled,
        setOnlineSourcePreference,
        setGaplessPlaybackEnabled,
        setCrossfadeEnabled,
        setCrossfadeDurationSec,
        setSleepTimer,
        cancelSleepTimer,
    } = useAudioPreferences();

    const {
        permissionGranted,
        libraryScanStatus,
        setPermissionGranted,
        refreshLibrary,
        deleteSong,
        deleteSongs,
        playFromUrl,
    } = useLibraryActions();

    const likedIds = useMemo(() => new Set(likedIdsRaw), [likedIdsRaw]);
    const playlists = useMemo<CompatPlaylist[]>(
        () => playlistsRaw.map((playlist) => ({
            ...playlist,
            assetIds: playlist.trackIds,
        })),
        [playlistsRaw]
    );

    const toggleLike = useCallback((track: string | LegacyAudioItem | AudioTrack) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (typeof track === 'string') {
            toggleLikeStore(track);
            return;
        }
        toggleLikeStore(coerceTrack(track));
    }, [toggleLikeStore]);

    const startQueuePlayback = useCallback(async (
        playbackQueue: (LegacyAudioItem | AudioTrack)[],
        startIndex = 0,
        context: NowPlayingContext = { type: 'library', title: 'Library Queue' }
    ) => {
        const tracks = playbackQueue.map(coerceTrack);
        return audioRuntimeController.replaceQueue(tracks, startIndex, context, true);
    }, []);

    const loadAudio = useCallback(async (
        item: LegacyAudioItem | AudioTrack,
        shouldPlay = true
    ) => audioRuntimeController.playTrack(coerceTrack(item), shouldPlay), []);

    const playLikedSongs = useCallback(async () => {
        const likedTracks = getLikedTracks(useAudioStore.getState());
        if (likedTracks.length === 0) {
            return false;
        }

        return audioRuntimeController.replaceQueue(likedTracks, 0, { type: 'liked', title: 'Liked Songs' }, true);
    }, []);

    const playPlaylist = useCallback(async (playlistId: string) => {
        const playlist = useAudioStore.getState().playlists.find((entry) => entry.id === playlistId);
        if (!playlist) {
            return false;
        }

        const tracks = getPlaylistTracks(useAudioStore.getState(), playlistId);
        if (tracks.length === 0) {
            return false;
        }

        return audioRuntimeController.replaceQueue(
            tracks,
            0,
            {
                type: 'playlist',
                title: playlist.name,
                playlistId: playlist.id,
            },
            true
        );
    }, []);

    const clearAudio = useCallback(() => audioRuntimeController.stop(), []);

    return {
        permissionGranted,
        libraryScanStatus,
        setPermissionGranted,
        library: library as unknown as MediaLibrary.Asset[],
        currentSong: currentTrack as unknown as MediaLibrary.Asset | null,
        currentTrack: playerTrack,
        queue: queue as unknown as MediaLibrary.Asset[],
        currentIndex,
        nowPlayingContext,
        playlists,
        likedIds,
        isPlaying,
        isBuffering,
        playbackStatus,
        playbackError,
        position,
        duration,
        waveformSamples,
        adaptiveAccent,
        playbackRate,
        shuffle,
        repeatMode,
        autoOpenPlayerOnPlay,
        showVideoBadges,
        enableLockScreenControls,
        onlineSourceEnabled,
        onlineSourcePreference,
        gaplessPlaybackEnabled,
        crossfadeEnabled,
        crossfadeDurationSec,
        sleepTimer,
        setCurrentIndex,
        setPlaybackRate,
        setShuffle,
        setRepeatMode,
        setAutoOpenPlayerOnPlay,
        setShowVideoBadges,
        setEnableLockScreenControls,
        setOnlineSourceEnabled,
        setOnlineSourcePreference,
        setGaplessPlaybackEnabled,
        setCrossfadeEnabled,
        setCrossfadeDurationSec,
        setSleepTimer,
        cancelSleepTimer,
        handlePlayPause: playPause,
        handleNext: next,
        handlePrevious: previous,
        seekTo,
        clearPlaybackError,
        refreshLibrary,
        deleteSong,
        deleteSongs,
        toggleLike,
        createPlaylist,
        addToPlaylist: (playlistId: string, track: string | LegacyAudioItem | AudioTrack) =>
            addToPlaylist(playlistId, typeof track === 'string' ? track : coerceTrack(track)),
        deletePlaylist,
        playLikedSongs,
        playPlaylist,
        startQueuePlayback,
        playFromUrl,
        loadAudio,
        clearAudio,
        selectQueueItem,
        enqueueTracks,
        moveQueueItem,
        removeQueueItem,
    };
};
