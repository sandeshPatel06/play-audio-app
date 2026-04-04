import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioPlayer } from 'expo-audio';
import * as MediaLibrary from 'expo-media-library';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type RepeatMode = 'off' | 'one' | 'all';

export interface Playlist {
    id: string;
    name: string;
    assetIds: string[];
}

export type NowPlayingContext = {
    type: 'library' | 'playlist' | 'liked' | 'remote' | 'jiosaavn';
    title: string;
    playlistId?: string;
} | null;

const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ');

interface AudioState {
    player: AudioPlayer | null;
    isPlaying: boolean;
    currentSong: MediaLibrary.Asset | null;
    library: MediaLibrary.Asset[];
    queue: MediaLibrary.Asset[];
    currentIndex: number;
    nowPlayingContext: NowPlayingContext;
    position: number; // in seconds
    duration: number; // in seconds
    shuffle: boolean;
    repeatMode: RepeatMode;
    playbackRate: number;
    permissionGranted: boolean;
    likedIds: Set<string>; // Asset IDs - using Set for O(1) lookups
    playlists: Playlist[];
    autoOpenPlayerOnPlay: boolean;
    showVideoBadges: boolean;
    enableLockScreenControls: boolean;
    onlineSourceEnabled: boolean;
    onlineSourcePreference: 'jiosaavn' | 'local' | 'both';

    // Actions
    setPlayer: (player: AudioPlayer | null) => void;
    setIsPlaying: (playing: boolean) => void;
    setCurrentSong: (song: MediaLibrary.Asset | null) => void;
    setLibrary: (library: MediaLibrary.Asset[]) => void;
    setQueue: (queue: MediaLibrary.Asset[]) => void;
    setCurrentIndex: (index: number) => void;
    setNowPlayingContext: (context: NowPlayingContext) => void;
    setPosition: (pos: number) => void;
    setDuration: (dur: number) => void;
    setShuffle: (shuffle: boolean) => void;
    setRepeatMode: (mode: RepeatMode) => void;
    setPlaybackRate: (rate: number) => void;
    setPermissionGranted: (granted: boolean) => void;
    setAutoOpenPlayerOnPlay: (enabled: boolean) => void;
    setShowVideoBadges: (enabled: boolean) => void;
    setEnableLockScreenControls: (enabled: boolean) => void;
    setOnlineSourceEnabled: (enabled: boolean) => void;
    setOnlineSourcePreference: (pref: 'jiosaavn' | 'local' | 'both') => void;
    toggleLike: (id: string) => void;
    createPlaylist: (name: string) => void;
    addToPlaylist: (playlistId: string, assetId: string) => void;
    removeFromPlaylist: (playlistId: string, assetId: string) => void;
    deletePlaylist: (playlistId: string) => void;
    clearLikedSongs: () => void;
    clearPlaylists: () => void;
    reconcileAssetReferences: (validAssetIds: string[]) => void;
    clearAudio: () => void;
}

const audioStoreInitialState = {
    player: null,
    isPlaying: false,
    currentSong: null,
    library: [],
    queue: [],
    currentIndex: -1,
    nowPlayingContext: null,
    position: 0,
    duration: 0,
    shuffle: false,
    repeatMode: 'off' as RepeatMode,
    playbackRate: 1,
    permissionGranted: false,
    likedIds: new Set<string>(),
    playlists: [],
    autoOpenPlayerOnPlay: true,
    showVideoBadges: true,
    enableLockScreenControls: true,
    onlineSourceEnabled: false,
    onlineSourcePreference: 'both' as const,
};

export const useAudioStore = create<AudioState>()(
    persist(
        (set) => ({
            ...audioStoreInitialState,

            setPlayer: (player) => set({ player }),
            setIsPlaying: (isPlaying) => set({ isPlaying }),
            setCurrentSong: (currentSong) => set({ currentSong }),
            setLibrary: (library) => set({ library }),
            setQueue: (queue) => set({ queue }),
            setCurrentIndex: (currentIndex) => set({ currentIndex }),
            setNowPlayingContext: (nowPlayingContext) => set({ nowPlayingContext }),
            setPosition: (position) => set({ position }),
            setDuration: (duration) => set({ duration }),
            setShuffle: (shuffle) => set({ shuffle }),
            setRepeatMode: (repeatMode) => set({ repeatMode }),
            setPlaybackRate: (playbackRate) => set({ playbackRate }),
            setPermissionGranted: (permissionGranted) => set({ permissionGranted }),
            setAutoOpenPlayerOnPlay: (autoOpenPlayerOnPlay) => set({ autoOpenPlayerOnPlay }),
            setShowVideoBadges: (showVideoBadges) => set({ showVideoBadges }),
            setEnableLockScreenControls: (enableLockScreenControls) => set({ enableLockScreenControls }),
            setOnlineSourceEnabled: (onlineSourceEnabled) => set({ onlineSourceEnabled }),
            setOnlineSourcePreference: (onlineSourcePreference) => set({ onlineSourcePreference }),

            toggleLike: (id) => set((state) => {
                const newLikedIds = new Set(state.likedIds);
                if (newLikedIds.has(id)) {
                    newLikedIds.delete(id);
                } else {
                    newLikedIds.add(id);
                }
                return { likedIds: newLikedIds };
            }),

            createPlaylist: (name) => set((state) => {
                const normalizedName = normalizeName(name);
                if (!normalizedName) return state;

                const exists = state.playlists.some(
                    (playlist) => playlist.name.toLowerCase() === normalizedName.toLowerCase()
                );
                if (exists) return state;

                return {
                    playlists: [
                        ...state.playlists,
                        { id: Date.now().toString(), name: normalizedName, assetIds: [] }
                    ]
                };
            }),

            addToPlaylist: (playlistId, assetId) => set((state) => ({
                playlists: state.playlists.map(p =>
                    p.id === playlistId
                        ? { ...p, assetIds: [...new Set([...p.assetIds, assetId])] }
                        : p
                )
            })),

            removeFromPlaylist: (playlistId, assetId) => set((state) => ({
                playlists: state.playlists.map(p =>
                    p.id === playlistId
                        ? { ...p, assetIds: p.assetIds.filter(id => id !== assetId) }
                        : p
                )
            })),

            deletePlaylist: (playlistId) => set((state) => ({
                playlists: state.playlists.filter(p => p.id !== playlistId)
            })),

            clearLikedSongs: () => set({ likedIds: new Set<string>() }),
            clearPlaylists: () => set({ playlists: [] }),

            reconcileAssetReferences: (validAssetIds) => set((state) => {
                const validSet = new Set(validAssetIds);
                const newLikedIds = new Set<string>();
                for (const id of state.likedIds) {
                    if (validSet.has(id)) {
                        newLikedIds.add(id);
                    }
                }
                return {
                    likedIds: newLikedIds,
                    playlists: state.playlists.map((playlist) => ({
                        ...playlist,
                        assetIds: playlist.assetIds.filter((id) => validSet.has(id))
                    })),
                };
            }),

            clearAudio: () => set((state) => {
                try {
                    state.player?.remove();
                } catch (e) {
                    console.warn('[AudioStore] Error removing player:', e);
                }
                return {
                    player: null,
                    isPlaying: false,
                    currentSong: null,
                    queue: [],
                    currentIndex: -1,
                    nowPlayingContext: null,
                    position: 0,
                    duration: 0,
                };
            }),
        }),
        {
            name: 'sonic-flow-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                likedIds: Array.from(state.likedIds),
                playlists: state.playlists,
                shuffle: state.shuffle,
                repeatMode: state.repeatMode,
                playbackRate: state.playbackRate,
                autoOpenPlayerOnPlay: state.autoOpenPlayerOnPlay,
                showVideoBadges: state.showVideoBadges,
                enableLockScreenControls: state.enableLockScreenControls,
                onlineSourceEnabled: state.onlineSourceEnabled,
                onlineSourcePreference: state.onlineSourcePreference,
}),
        }
    )
);
