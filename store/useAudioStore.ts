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

interface AudioState {
    player: AudioPlayer | null;
    isPlaying: boolean;
    currentSong: MediaLibrary.Asset | null;
    queue: MediaLibrary.Asset[];
    currentIndex: number;
    position: number; // in seconds
    duration: number; // in seconds
    shuffle: boolean;
    repeatMode: RepeatMode;
    permissionGranted: boolean;
    likedIds: string[]; // Asset IDs
    playlists: Playlist[];

    // Actions
    setPlayer: (player: AudioPlayer | null) => void;
    setIsPlaying: (playing: boolean) => void;
    setCurrentSong: (song: MediaLibrary.Asset | null) => void;
    setQueue: (queue: MediaLibrary.Asset[]) => void;
    setCurrentIndex: (index: number) => void;
    setPosition: (pos: number) => void;
    setDuration: (dur: number) => void;
    setShuffle: (shuffle: boolean) => void;
    setRepeatMode: (mode: RepeatMode) => void;
    setPermissionGranted: (granted: boolean) => void;
    toggleLike: (id: string) => void;
    createPlaylist: (name: string) => void;
    addToPlaylist: (playlistId: string, assetId: string) => void;
    removeFromPlaylist: (playlistId: string, assetId: string) => void;
    deletePlaylist: (playlistId: string) => void;
    clearAudio: () => void;
}

export const useAudioStore = create<AudioState>()(
    persist(
        (set) => ({
            player: null,
            isPlaying: false,
            currentSong: null,
            queue: [],
            currentIndex: -1,
            position: 0,
            duration: 0,
            shuffle: false,
            repeatMode: 'off',
            permissionGranted: false,
            likedIds: [],
            playlists: [],

            setPlayer: (player) => set({ player }),
            setIsPlaying: (isPlaying) => set({ isPlaying }),
            setCurrentSong: (currentSong) => set({ currentSong }),
            setQueue: (queue) => set({ queue }),
            setCurrentIndex: (currentIndex) => set({ currentIndex }),
            setPosition: (position) => set({ position }),
            setDuration: (duration) => set({ duration }),
            setShuffle: (shuffle) => set({ shuffle }),
            setRepeatMode: (repeatMode) => set({ repeatMode }),
            setPermissionGranted: (permissionGranted) => set({ permissionGranted }),

            toggleLike: (id) => set((state) => ({
                likedIds: state.likedIds.includes(id)
                    ? state.likedIds.filter(i => i !== id)
                    : [...state.likedIds, id]
            })),

            createPlaylist: (name) => set((state) => ({
                playlists: [...state.playlists, { id: Date.now().toString(), name, assetIds: [] }]
            })),

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

            clearAudio: () => set((state) => {
                state.player?.remove();
                return {
                    player: null,
                    isPlaying: false,
                    currentSong: null,
                    position: 0,
                    duration: 0,
                };
            }),
        }),
        {
            name: 'sonic-flow-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                likedIds: state.likedIds,
                playlists: state.playlists,
                shuffle: state.shuffle,
                repeatMode: state.repeatMode,
            }),
        }
    )
);
