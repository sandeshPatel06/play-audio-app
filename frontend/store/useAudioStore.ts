import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
    AudioTrack,
    NowPlayingContext,
    OnlineSourcePreference,
    PlaybackError,
    PlaybackStatus,
    Playlist,
    QueueEntry,
    RecentTrack,
    RepeatMode,
    SleepTimerState,
} from '../types/audio';
import {
    createQueueEntries,
    getNextQueueIndex,
    getPreviousQueueIndex,
    insertTracksIntoQueue,
    moveQueueEntry,
    recordRecentTrack,
    removeQueueEntryAt,
} from '../utils/audioQueue';
import { DEFAULT_SLEEP_TIMER } from '../utils/sleepTimer';

const STORE_VERSION = 2;
const STORAGE_KEY = 'sonic-flow-storage';

const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ');

interface AudioStoreState {
    permissionGranted: boolean;
    libraryScanStatus: 'idle' | 'scanning' | 'ready' | 'error';
    library: AudioTrack[];
    currentTrack: AudioTrack | null;
    queue: QueueEntry[];
    currentIndex: number;
    nowPlayingContext: NowPlayingContext;
    playbackStatus: PlaybackStatus;
    playbackError: PlaybackError | null;
    isPlaying: boolean;
    isBuffering: boolean;
    position: number;
    duration: number;
    playbackRate: number;
    waveformSamples: number[];
    adaptiveAccent: string | null;
    shuffle: boolean;
    repeatMode: RepeatMode;
    likedIds: string[];
    playlists: Playlist[];
    recentlyPlayed: RecentTrack[];
    trackSnapshots: Record<string, AudioTrack>;
    autoOpenPlayerOnPlay: boolean;
    showVideoBadges: boolean;
    enableLockScreenControls: boolean;
    onlineSourceEnabled: boolean;
    onlineSourcePreference: OnlineSourcePreference;
    gaplessPlaybackEnabled: boolean;
    crossfadeEnabled: boolean;
    crossfadeDurationSec: number;
    sleepTimer: SleepTimerState;
    volume: number;
    isMuted: boolean;

    setPermissionGranted: (granted: boolean) => void;
    setLibraryScanStatus: (status: AudioStoreState['libraryScanStatus']) => void;
    setLibrary: (library: AudioTrack[]) => void;
    setCurrentTrack: (track: AudioTrack | null) => void;
    setQueue: (queue: QueueEntry[]) => void;
    replaceQueueState: (tracks: AudioTrack[], startIndex: number, context: NowPlayingContext) => void;
    setCurrentIndex: (index: number) => void;
    setNowPlayingContext: (context: NowPlayingContext) => void;
    setPlaybackStatus: (status: PlaybackStatus) => void;
    setPlaybackError: (error: PlaybackError | null) => void;
    setIsPlaying: (playing: boolean) => void;
    setIsBuffering: (buffering: boolean) => void;
    setPosition: (position: number) => void;
    setDuration: (duration: number) => void;
    setPlaybackRate: (rate: number) => void;
    setWaveformSamples: (samples: number[]) => void;
    setAdaptiveAccent: (accent: string | null) => void;
    setShuffle: (shuffle: boolean) => void;
    setRepeatMode: (mode: RepeatMode) => void;
    setAutoOpenPlayerOnPlay: (enabled: boolean) => void;
    setShowVideoBadges: (enabled: boolean) => void;
    setEnableLockScreenControls: (enabled: boolean) => void;
    setOnlineSourceEnabled: (enabled: boolean) => void;
    setOnlineSourcePreference: (preference: OnlineSourcePreference) => void;
    setGaplessPlaybackEnabled: (enabled: boolean) => void;
    setCrossfadeEnabled: (enabled: boolean) => void;
    setCrossfadeDurationSec: (seconds: number) => void;
    setSleepTimer: (state: SleepTimerState) => void;
    cancelSleepTimer: () => void;
    setVolume: (volume: number) => void;
    setMuted: (isMuted: boolean) => void;
    rememberTrack: (track: AudioTrack) => void;
    rememberTracks: (tracks: AudioTrack[]) => void;
    toggleLike: (track: AudioTrack | string) => void;
    createPlaylist: (name: string) => void;
    addToPlaylist: (playlistId: string, track: AudioTrack | string) => void;
    removeFromPlaylist: (playlistId: string, trackId: string) => void;
    deletePlaylist: (playlistId: string) => void;
    enqueueTracks: (tracks: AudioTrack[], position: 'next' | 'end') => void;
    moveQueueItem: (from: number, to: number) => void;
    removeQueueItem: (index: number) => { removedCurrent: boolean; nextIndex: number };
    recordRecentlyPlayed: (track: AudioTrack) => void;
    reconcileTrackReferences: (nextLibrary: AudioTrack[]) => void;
    clearPlayback: () => void;
}

const initialState = {
    permissionGranted: false,
    libraryScanStatus: 'idle' as const,
    library: [],
    currentTrack: null,
    queue: [],
    currentIndex: -1,
    nowPlayingContext: null,
    playbackStatus: 'idle' as PlaybackStatus,
    playbackError: null,
    isPlaying: false,
    isBuffering: false,
    position: 0,
    duration: 0,
    playbackRate: 1,
    waveformSamples: [],
    adaptiveAccent: null,
    shuffle: false,
    repeatMode: 'off' as RepeatMode,
    likedIds: [],
    playlists: [],
    recentlyPlayed: [] as RecentTrack[],
    trackSnapshots: {} as Record<string, AudioTrack>,
    autoOpenPlayerOnPlay: true,
    showVideoBadges: true,
    enableLockScreenControls: true,
    onlineSourceEnabled: false,
    onlineSourcePreference: 'both' as OnlineSourcePreference,
    gaplessPlaybackEnabled: true,
    crossfadeEnabled: false,
    crossfadeDurationSec: 3,
    sleepTimer: DEFAULT_SLEEP_TIMER,
    volume: 1,
    isMuted: false,
};

const rememberTrackInMap = (
    trackSnapshots: Record<string, AudioTrack>,
    track: AudioTrack
) => ({
    ...trackSnapshots,
    [track.id]: track,
});

export const migratePersistedAudioState = (persistedState: unknown) => {
    const state = (persistedState || {}) as Record<string, any>;

    return {
        ...initialState,
        likedIds: Array.isArray(state.likedIds) ? state.likedIds : [],
        playlists: Array.isArray(state.playlists)
            ? state.playlists.map((playlist: any) => ({
                id: String(playlist.id),
                name: String(playlist.name || 'Playlist'),
                trackIds: Array.isArray(playlist.trackIds)
                    ? playlist.trackIds
                    : Array.isArray(playlist.assetIds)
                        ? playlist.assetIds
                        : [],
            }))
            : [],
        recentlyPlayed: Array.isArray(state.recentlyPlayed) ? state.recentlyPlayed : [],
        trackSnapshots: state.trackSnapshots || {},
        shuffle: Boolean(state.shuffle),
        repeatMode: ['off', 'one', 'all'].includes(state.repeatMode) ? state.repeatMode : 'off',
        playbackRate: typeof state.playbackRate === 'number' ? state.playbackRate : 1,
        autoOpenPlayerOnPlay: state.autoOpenPlayerOnPlay ?? true,
        showVideoBadges: state.showVideoBadges ?? true,
        enableLockScreenControls: state.enableLockScreenControls ?? true,
        onlineSourceEnabled: state.onlineSourceEnabled ?? false,
        onlineSourcePreference: ['jiosaavn', 'local', 'both'].includes(state.onlineSourcePreference)
            ? state.onlineSourcePreference
            : 'both',
        gaplessPlaybackEnabled: state.gaplessPlaybackEnabled ?? true,
        crossfadeEnabled: state.crossfadeEnabled ?? false,
        crossfadeDurationSec: typeof state.crossfadeDurationSec === 'number' ? state.crossfadeDurationSec : 3,
        volume: typeof state.volume === 'number' ? state.volume : 1,
        isMuted: Boolean(state.isMuted),
    };
};

export const useAudioStore = create<AudioStoreState>()(
    persist(
        (set, get) => ({
            ...initialState,

            setPermissionGranted: (permissionGranted) => set({ permissionGranted }),
            setLibraryScanStatus: (libraryScanStatus) => set({ libraryScanStatus }),
            setLibrary: (library) => set({ library }),
            setCurrentTrack: (currentTrack) => set({ currentTrack }),
            setQueue: (queue) => set({ queue }),
            replaceQueueState: (tracks, startIndex, nowPlayingContext) => set({
                queue: createQueueEntries(tracks),
                currentIndex: tracks.length === 0 ? -1 : Math.min(Math.max(startIndex, 0), tracks.length - 1),
                nowPlayingContext,
            }),
            setCurrentIndex: (currentIndex) => set({ currentIndex }),
            setNowPlayingContext: (nowPlayingContext) => set({ nowPlayingContext }),
            setPlaybackStatus: (playbackStatus) => set({ playbackStatus }),
            setPlaybackError: (playbackError) => set({ playbackError }),
            setIsPlaying: (isPlaying) => set({ isPlaying }),
            setIsBuffering: (isBuffering) => set({ isBuffering }),
            setPosition: (position) => set({ position }),
            setDuration: (duration) => set({ duration }),
            setPlaybackRate: (playbackRate) => set({ playbackRate }),
            setWaveformSamples: (waveformSamples) => set({ waveformSamples }),
            setAdaptiveAccent: (adaptiveAccent) => set({ adaptiveAccent }),
            setShuffle: (shuffle) => set({ shuffle }),
            setRepeatMode: (repeatMode) => set({ repeatMode }),
            setAutoOpenPlayerOnPlay: (autoOpenPlayerOnPlay) => set({ autoOpenPlayerOnPlay }),
            setShowVideoBadges: (showVideoBadges) => set({ showVideoBadges }),
            setEnableLockScreenControls: (enableLockScreenControls) => set({ enableLockScreenControls }),
            setOnlineSourceEnabled: (onlineSourceEnabled) => set({ onlineSourceEnabled }),
            setOnlineSourcePreference: (onlineSourcePreference) => set({ onlineSourcePreference }),
            setGaplessPlaybackEnabled: (gaplessPlaybackEnabled) => set({ gaplessPlaybackEnabled }),
            setCrossfadeEnabled: (crossfadeEnabled) => set({ crossfadeEnabled }),
            setCrossfadeDurationSec: (crossfadeDurationSec) => set({ crossfadeDurationSec }),
            setSleepTimer: (sleepTimer) => set({ sleepTimer }),
            cancelSleepTimer: () => set({ sleepTimer: DEFAULT_SLEEP_TIMER }),
            setVolume: (volume) => set({ volume }),
            setMuted: (isMuted) => set({ isMuted }),

            rememberTrack: (track) => set((state) => ({
                trackSnapshots: rememberTrackInMap(state.trackSnapshots, track),
            })),
            rememberTracks: (tracks) => set((state) => ({
                trackSnapshots: tracks.reduce(
                    (snapshotMap, track) => rememberTrackInMap(snapshotMap, track),
                    state.trackSnapshots
                ),
            })),

            toggleLike: (track) => set((state) => {
                const trackId = typeof track === 'string' ? track : track.id;
                const likedIds = state.likedIds.includes(trackId)
                    ? state.likedIds.filter((id) => id !== trackId)
                    : [...state.likedIds, trackId];

                const nextState: Partial<AudioStoreState> = { likedIds };
                if (typeof track !== 'string') {
                    nextState.trackSnapshots = rememberTrackInMap(state.trackSnapshots, track);
                }
                return nextState as Pick<AudioStoreState, 'likedIds' | 'trackSnapshots'>;
            }),

            createPlaylist: (name) => set((state) => {
                const normalizedName = normalizeName(name);
                if (!normalizedName) {
                    return state;
                }

                const exists = state.playlists.some(
                    (playlist) => playlist.name.toLowerCase() === normalizedName.toLowerCase()
                );
                if (exists) {
                    return state;
                }

                return {
                    playlists: [
                        ...state.playlists,
                        { id: Date.now().toString(), name: normalizedName, trackIds: [] },
                    ],
                };
            }),

            addToPlaylist: (playlistId, track) => set((state) => {
                const trackId = typeof track === 'string' ? track : track.id;
                return {
                    playlists: state.playlists.map((playlist) =>
                        playlist.id === playlistId
                            ? {
                                ...playlist,
                                trackIds: [...new Set([...playlist.trackIds, trackId])],
                            }
                            : playlist
                    ),
                    trackSnapshots: typeof track === 'string'
                        ? state.trackSnapshots
                        : rememberTrackInMap(state.trackSnapshots, track),
                };
            }),

            removeFromPlaylist: (playlistId, trackId) => set((state) => ({
                playlists: state.playlists.map((playlist) =>
                    playlist.id === playlistId
                        ? {
                            ...playlist,
                            trackIds: playlist.trackIds.filter((id) => id !== trackId),
                        }
                        : playlist
                ),
            })),

            deletePlaylist: (playlistId) => set((state) => ({
                playlists: state.playlists.filter((playlist) => playlist.id !== playlistId),
            })),

            enqueueTracks: (tracks, position) => set((state) => ({
                queue: insertTracksIntoQueue(state.queue, state.currentIndex, tracks, position),
                trackSnapshots: tracks.reduce(
                    (snapshotMap, track) => rememberTrackInMap(snapshotMap, track),
                    state.trackSnapshots
                ),
            })),

            moveQueueItem: (from, to) => set((state) => {
                const result = moveQueueEntry(state.queue, state.currentIndex, from, to);
                return {
                    queue: result.queue,
                    currentIndex: result.currentIndex,
                };
            }),

            removeQueueItem: (index) => {
                const { queue, currentIndex } = get();
                const result = removeQueueEntryAt(queue, currentIndex, index);
                set({
                    queue: result.queue,
                    currentIndex: result.currentIndex,
                    currentTrack: result.currentIndex >= 0 ? result.queue[result.currentIndex]?.track ?? null : null,
                });
                return {
                    removedCurrent: result.removedCurrent,
                    nextIndex: result.currentIndex,
                };
            },

            recordRecentlyPlayed: (track) => set((state) => ({
                recentlyPlayed: recordRecentTrack(state.recentlyPlayed, track),
                trackSnapshots: rememberTrackInMap(state.trackSnapshots, track),
            })),

            reconcileTrackReferences: (nextLibrary) => set((state) => {
                const validLibraryIds = new Set(nextLibrary.map((track) => track.id));
                const resolvedSnapshots = { ...state.trackSnapshots };

                Object.keys(resolvedSnapshots).forEach((trackId) => {
                    const snapshot = resolvedSnapshots[trackId];
                    if (snapshot?.source === 'library' && !validLibraryIds.has(trackId)) {
                        delete resolvedSnapshots[trackId];
                    }
                });

                const hasTrack = (trackId: string) =>
                    validLibraryIds.has(trackId) || Boolean(resolvedSnapshots[trackId]);

                const currentTrackStillExists = state.currentTrack ? hasTrack(state.currentTrack.id) : true;
                const nextQueue = state.queue.filter((entry) => hasTrack(entry.track.id));
                const nextCurrentIndex = nextQueue.findIndex((entry) => entry.track.id === state.currentTrack?.id);

                return {
                    library: nextLibrary,
                    likedIds: state.likedIds.filter(hasTrack),
                    playlists: state.playlists.map((playlist) => ({
                        ...playlist,
                        trackIds: playlist.trackIds.filter(hasTrack),
                    })),
                    recentlyPlayed: state.recentlyPlayed.filter((track) => hasTrack(track.id)),
                    trackSnapshots: resolvedSnapshots,
                    queue: nextQueue,
                    currentTrack: currentTrackStillExists ? state.currentTrack : null,
                    currentIndex: currentTrackStillExists ? nextCurrentIndex : -1,
                };
            }),

            clearPlayback: () => set({
                currentTrack: null,
                queue: [],
                currentIndex: -1,
                nowPlayingContext: null,
                playbackStatus: 'idle',
                playbackError: null,
                isPlaying: false,
                isBuffering: false,
                position: 0,
                duration: 0,
                waveformSamples: [],
                adaptiveAccent: null,
                sleepTimer: DEFAULT_SLEEP_TIMER,
            }),
        }),
        {
            name: STORAGE_KEY,
            version: STORE_VERSION,
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                likedIds: state.likedIds,
                playlists: state.playlists,
                recentlyPlayed: state.recentlyPlayed,
                trackSnapshots: state.trackSnapshots,
                shuffle: state.shuffle,
                repeatMode: state.repeatMode,
                playbackRate: state.playbackRate,
                autoOpenPlayerOnPlay: state.autoOpenPlayerOnPlay,
                showVideoBadges: state.showVideoBadges,
                enableLockScreenControls: state.enableLockScreenControls,
                onlineSourceEnabled: state.onlineSourceEnabled,
                onlineSourcePreference: state.onlineSourcePreference,
                gaplessPlaybackEnabled: state.gaplessPlaybackEnabled,
                crossfadeEnabled: state.crossfadeEnabled,
                crossfadeDurationSec: state.crossfadeDurationSec,
                volume: state.volume,
                isMuted: state.isMuted,
            }),
            migrate: migratePersistedAudioState,
        }
    )
);

export const selectQueueTracks = (state: AudioStoreState) => state.queue.map((entry) => entry.track);

const getTrackById = (state: AudioStoreState, trackId: string) =>
    state.library.find((track) => track.id === trackId) ||
    state.trackSnapshots[trackId] ||
    null;

export const getPlaylistTracks = (state: AudioStoreState, playlistId: string) => {
    const playlist = state.playlists.find((entry) => entry.id === playlistId);
    if (!playlist) {
        return [];
    }

    return playlist.trackIds
        .map((trackId) => getTrackById(state, trackId))
        .filter(Boolean) as AudioTrack[];
};

export const getLikedTracks = (state: AudioStoreState) =>
    state.likedIds
        .map((trackId) => getTrackById(state, trackId))
        .filter(Boolean) as AudioTrack[];

export const getNextPlayableIndex = (state: AudioStoreState) =>
    getNextQueueIndex(state.queue, state.currentIndex, state.repeatMode, state.shuffle);

export const getPreviousPlayableIndex = (state: AudioStoreState) =>
    getPreviousQueueIndex(state.queue, state.currentIndex, state.repeatMode);

export type {
    AudioTrack,
    DeleteTracksResult,
    NowPlayingContext,
    PlaybackError,
    Playlist,
} from '../types/audio';
