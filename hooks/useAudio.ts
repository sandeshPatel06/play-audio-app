import { AudioStatus, createAudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect } from 'react';
import { useAudioStore } from '../store/useAudioStore';

export const useAudio = () => {
    const store = useAudioStore();

    const loadAudio = async (asset: MediaLibrary.Asset, shouldPlay = true) => {
        try {
            const metadata = {
                title: asset.filename,
                artist: 'Sonic Flow',
                artwork: require('../assets/images/placeholder.png'),
            };

            if (!store.player) {
                const newPlayer = createAudioPlayer(asset.uri);
                store.setPlayer(newPlayer);
                if (typeof newPlayer.setActiveForLockScreen === 'function') {
                    newPlayer.setActiveForLockScreen(true, metadata);
                }
                if (shouldPlay) newPlayer.play();
            } else {
                store.player.replace(asset.uri);
                if (typeof store.player.updateLockScreenMetadata === 'function') {
                    store.player.updateLockScreenMetadata(metadata);
                }
                if (shouldPlay) store.player.play();
            }
            store.setCurrentSong(asset);
            store.setIsPlaying(shouldPlay);
        } catch (error) {
            console.error("Error loading audio:", error);
        }
    };

    const handleNext = useCallback(async () => {
        if (store.queue.length === 0) return;

        if (store.repeatMode === 'one') {
            store.player?.seekTo(0);
            store.player?.play();
            return;
        }

        let nextIndex;
        if (store.shuffle) {
            nextIndex = Math.floor(Math.random() * store.queue.length);
        } else {
            nextIndex = store.currentIndex + 1;
            if (nextIndex >= store.queue.length) {
                if (store.repeatMode === 'all') {
                    nextIndex = 0;
                } else {
                    return;
                }
            }
        }

        const nextSong = store.queue[nextIndex];
        store.setCurrentIndex(nextIndex);
        await loadAudio(nextSong);
    }, [store.currentIndex, store.queue, store.repeatMode, store.shuffle, store.player]);

    const handlePrevious = async () => {
        if (store.queue.length === 0) return;

        let prevIndex = store.currentIndex - 1;
        if (prevIndex < 0) {
            if (store.repeatMode === 'all') {
                prevIndex = store.queue.length - 1;
            } else {
                prevIndex = 0;
            }
        }

        const prevSong = store.queue[prevIndex];
        store.setCurrentIndex(prevIndex);
        await loadAudio(prevSong);
    };

    const toggleLike = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        store.toggleLike(id);
    };

    const playLikedSongs = async () => {
        const likedSongs = store.queue.filter(s => store.likedIds.includes(s.id));
        if (likedSongs.length > 0) {
            store.setQueue(likedSongs);
            store.setCurrentIndex(0);
            await loadAudio(likedSongs[0]);
        }
    };

    const playPlaylist = async (playlistId: string) => {
        const playlist = store.playlists.find(p => p.id === playlistId);
        if (playlist) {
            const playlistSongs = store.queue.filter(s => playlist.assetIds.includes(s.id));
            if (playlistSongs.length > 0) {
                store.setQueue(playlistSongs);
                store.setCurrentIndex(0);
                await loadAudio(playlistSongs[0]);
            }
        }
    };

    const onPlaybackStatusUpdate = useCallback((status: AudioStatus) => {
        store.setPosition(status.currentTime);
        store.setDuration(status.duration);
        store.setIsPlaying(status.playing);

        if (status.playing && status.currentTime >= (status.duration - 0.5) && status.duration > 0) {
            handleNext();
        }
    }, [handleNext]);

    useEffect(() => {
        if (store.player) {
            const subscription = store.player.addListener('playbackStatusUpdate', onPlaybackStatusUpdate);
            return () => {
                subscription.remove();
            };
        }
    }, [store.player, onPlaybackStatusUpdate]);

    const handlePlayPause = async () => {
        if (!store.player) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (store.isPlaying) {
            store.player.pause();
        } else {
            store.player.play();
        }
    };

    const refreshLibrary = useCallback(async () => {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') return;

        let allAssets: MediaLibrary.Asset[] = [];
        let hasNextPage = true;
        let endCursor: string | undefined;

        const supportedExtensions = new Set([
            'mp3', 'aac', 'm4a', 'wav', 'aiff', 'aif', 'flac',
            'alac', 'ogg', 'opus', 'wma', 'amr', 'mid', 'midi',
            'dsf', 'dff', 'pcm'
        ]);

        try {
            while (hasNextPage) {
                const media: MediaLibrary.PagedInfo<MediaLibrary.Asset> = await MediaLibrary.getAssetsAsync({
                    mediaType: 'audio',
                    sortBy: 'creationTime',
                    first: 500,
                    after: endCursor,
                });

                allAssets = [...allAssets, ...media.assets];
                hasNextPage = media.hasNextPage;
                endCursor = media.endCursor;
            }

            const filteredAssets = allAssets.filter(asset => {
                const filename = asset.filename.toLowerCase();
                const extension = filename.split('.').pop();
                return extension && supportedExtensions.has(extension);
            });

            store.setQueue(filteredAssets);
        } catch (error) {
            console.error("Error fetching audio assets:", error);
        }
    }, [store.setQueue]);

    const deleteSong = async (asset: MediaLibrary.Asset) => {
        try {
            const success = await MediaLibrary.deleteAssetsAsync([asset]);
            if (success) {
                await refreshLibrary();
                if (store.currentSong?.id === asset.id) {
                    store.player?.pause();
                    store.setPlayer(null);
                    store.setCurrentSong(null);
                    store.setIsPlaying(false);
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Delete failed:', error);
            return false;
        }
    };

    const renameSong = async (asset: MediaLibrary.Asset, newName: string) => {
        try {
            const directory = asset.uri.substring(0, asset.uri.lastIndexOf('/') + 1);
            const extension = asset.filename.substring(asset.filename.lastIndexOf('.'));
            const newUri = `${directory}${newName}${extension}`;

            await FileSystem.moveAsync({
                from: asset.uri,
                to: newUri
            });
            await refreshLibrary();
            return true;
        } catch (error) {
            console.error('Rename failed:', error);
            return false;
        }
    };

    const seekTo = async (positionSeconds: number) => {
        if (store.player) {
            await store.player.seekTo(positionSeconds);
        }
    };

    return {
        ...store,
        loadAudio,
        handlePlayPause,
        handleNext,
        handlePrevious,
        seekTo,
        refreshLibrary,
        deleteSong,
        renameSong,
        toggleLike,
        playLikedSongs,
        playPlaylist,
    };
};
