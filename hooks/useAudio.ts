import { AudioStatus, createAudioPlayer } from 'expo-audio';
import { Asset } from 'expo-asset';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useRef } from 'react';
import { NowPlayingContext } from '../store/useAudioStore';
import { useAudioStore } from '../store/useAudioStore';

const SUPPORTED_EXTENSIONS = new Set([
    'mp3', 'aac', 'm4a', 'wav', 'aiff', 'aif', 'flac',
    'alac', 'ogg', 'opus', 'wma', 'amr', 'mid', 'midi',
    'mp4', 'm4v', 'mov', 'webm',
    'dsf', 'dff', 'pcm'
]);

const LOCAL_SCAN_ROOTS = [FileSystem.Paths.document.uri, FileSystem.Paths.cache.uri].filter(Boolean) as string[];
const LOCAL_SCAN_MAX_DEPTH = 3;

const fileNameFromUri = (uri: string) => {
    const cleanUri = uri.split('?')[0];
    return cleanUri.substring(cleanUri.lastIndexOf('/') + 1) || 'track';
};

const isVideoExtension = (extension?: string | null) =>
    !!extension && ['mp4', 'm4v', 'mov', 'webm'].includes(extension.toLowerCase());

const isSupportedAudioFile = (uri: string) => {
    const filename = fileNameFromUri(uri).toLowerCase();
    const extension = filename.split('.').pop();
    return !!extension && SUPPORTED_EXTENSIONS.has(extension);
};

const trackFromUri = (
    uri: string,
    id: string,
    filename?: string,
    creationTime = Date.now()
): MediaLibrary.Asset =>
    {
        const name = filename || fileNameFromUri(uri);
        const extension = name.toLowerCase().split('.').pop();
        return {
            id,
            uri,
            filename: name,
            mediaType: isVideoExtension(extension) ? MediaLibrary.MediaType.video : MediaLibrary.MediaType.audio,
            creationTime,
            modificationTime: creationTime,
            duration: 0,
            width: 0,
            height: 0,
        } as MediaLibrary.Asset;
    };

const scanLocalDirectory = async (root: string, depth = 0): Promise<MediaLibrary.Asset[]> => {
    if (depth > LOCAL_SCAN_MAX_DEPTH) return [];
    const result: MediaLibrary.Asset[] = [];
    try {
        const entries = await FileSystemLegacy.readDirectoryAsync(root);
        for (const entry of entries) {
            const uri = `${root}${entry}`;
            const info = await FileSystemLegacy.getInfoAsync(uri);
            if (!info.exists) continue;

            if (info.isDirectory) {
                const children = await scanLocalDirectory(`${uri}/`, depth + 1);
                result.push(...children);
                continue;
            }

            if (isSupportedAudioFile(uri)) {
                result.push(trackFromUri(uri, `local:${uri}`, entry, Date.now()));
            }
        }
    } catch {
        // Ignore inaccessible subfolders in app cache/doc storage.
    }
    return result;
};

const LOCK_SCREEN_OPTIONS = {
    showSeekBackward: true,
    showSeekForward: true,
};

export const useAudio = () => {
    const store = useAudioStore();
    const hasTriggeredTrackEndRef = useRef(false);

    const disposePlayer = useCallback(() => {
        store.player?.remove();
        store.setPlayer(null);
    }, [store]);

    const clearPlaybackState = useCallback(() => {
        store.player?.pause();
        disposePlayer();
        store.setCurrentSong(null);
        store.setIsPlaying(false);
        store.setQueue([]);
        store.setCurrentIndex(-1);
        store.setNowPlayingContext(null);
        store.setPosition(0);
        store.setDuration(0);
        hasTriggeredTrackEndRef.current = false;
    }, [disposePlayer, store]);

    const resolvePlayableUri = async (asset: MediaLibrary.Asset) => {
        // Local/remote tracks already carry a direct playable URI.
        if (
            asset.id.startsWith('local:') ||
            asset.id.startsWith('remote:')
        ) {
            return asset.uri;
        }

        try {
            const info = await MediaLibrary.getAssetInfoAsync(asset);
            return info.localUri || info.uri || asset.uri;
        } catch {
            return asset.uri;
        }
    };

    const ensureDeletePermission = async () => {
        const existing = await MediaLibrary.getPermissionsAsync(false, ['audio', 'video']);
        if (existing.status === 'granted') return true;

        const requested = await MediaLibrary.requestPermissionsAsync(false, ['audio', 'video']);
        if (requested.status === 'granted') return true;

        // Fallback for runtimes that honor writeOnly differently.
        const writeRequested = await MediaLibrary.requestPermissionsAsync(true, ['audio', 'video']);
        return writeRequested.status === 'granted';
    };

    const deleteSongInternal = async (
        asset: MediaLibrary.Asset,
        options: {
            refreshAfterDelete?: boolean;
            mediaLibraryPermissionGranted?: boolean;
        } = {}
    ) => {
        const { refreshAfterDelete = true, mediaLibraryPermissionGranted = false } = options;

        if (asset.id.startsWith('local:') && asset.uri.startsWith('file://')) {
            await FileSystemLegacy.deleteAsync(asset.uri, { idempotent: true });
            if (refreshAfterDelete) {
                await refreshLibrary();
            }
            if (store.currentSong?.id === asset.id) {
                clearPlaybackState();
            }
            return true;
        }

        const allowed = mediaLibraryPermissionGranted || await ensureDeletePermission();
        if (!allowed) {
            return false;
        }

        const success = await MediaLibrary.deleteAssetsAsync([asset]);
        if (success) {
            if (refreshAfterDelete) {
                await refreshLibrary();
            }
            if (store.currentSong?.id === asset.id) {
                clearPlaybackState();
            }
            return true;
        }

        return false;
    };

    const loadAudio = async (asset: MediaLibrary.Asset, shouldPlay = true) => {
        try {
            const playableUri = await resolvePlayableUri(asset);
            hasTriggeredTrackEndRef.current = false;
            
            // Handle artwork with extra care for production environments
            let artworkUrl: string | undefined;
            try {
                const artworkAsset = Asset.fromModule(require('../assets/images/placeholder.png'));
                await artworkAsset.downloadAsync();
                artworkUrl = artworkAsset.localUri || artworkAsset.uri;
            } catch (artworkError) {
                console.warn('Failed to load placeholder artwork:', artworkError);
            }

            const metadata = {
                title: asset.filename,
                artist: 'Sonic Flow',
                albumTitle: 'Local Library',
                artworkUrl,
            };

            if (!store.player) {
                const newPlayer = createAudioPlayer(playableUri);
                store.setPlayer(newPlayer);
                if (store.enableLockScreenControls) {
                    newPlayer.setActiveForLockScreen(true, metadata, LOCK_SCREEN_OPTIONS);
                } else {
                    newPlayer.clearLockScreenControls();
                }
                newPlayer.setPlaybackRate(store.playbackRate);
                if (shouldPlay) newPlayer.play();
            } else {
                store.player.replace(playableUri);
                if (store.enableLockScreenControls) {
                    store.player.setActiveForLockScreen(true, metadata, LOCK_SCREEN_OPTIONS);
                    store.player.updateLockScreenMetadata(metadata);
                } else {
                    store.player.clearLockScreenControls();
                }
                store.player.setPlaybackRate(store.playbackRate);
                if (shouldPlay) store.player.play();
            }
            store.setCurrentSong({ ...asset, uri: playableUri } as MediaLibrary.Asset);
            store.setIsPlaying(shouldPlay);
        } catch (error) {
            console.error('Error loading audio:', error);
        }
    };

    const startQueuePlayback = async (
        playbackQueue: MediaLibrary.Asset[],
        startIndex = 0,
        context: NowPlayingContext = { type: 'library', title: 'Library Queue' }
    ) => {
        if (playbackQueue.length === 0) return;
        const safeIndex = Math.min(Math.max(startIndex, 0), playbackQueue.length - 1);

        store.setQueue(playbackQueue);
        store.setCurrentIndex(safeIndex);
        store.setNowPlayingContext(context ?? { type: 'library', title: 'Library Queue' });
        await loadAudio(playbackQueue[safeIndex]);
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
        const likedSongs = store.library.filter((song) => store.likedIds.includes(song.id));
        if (likedSongs.length === 0) return false;
        await startQueuePlayback(likedSongs, 0, { type: 'liked', title: 'Liked Songs' });
        return true;
    };

    const playPlaylist = async (playlistId: string) => {
        const playlist = store.playlists.find((p) => p.id === playlistId);
        if (!playlist) return false;

        const playlistSongs = playlist.assetIds
            .map((assetId) => store.library.find((song) => song.id === assetId))
            .filter(Boolean) as MediaLibrary.Asset[];

        if (playlistSongs.length === 0) return false;
        await startQueuePlayback(playlistSongs, 0, {
            type: 'playlist',
            title: playlist.name,
            playlistId: playlist.id,
        });
        return true;
    };

    const onPlaybackStatusUpdate = useCallback((status: AudioStatus) => {
        store.setPosition(status.currentTime);
        store.setDuration(status.duration);
        store.setIsPlaying(status.playing);

        const nearTrackEnd = status.playing && status.duration > 0 && status.currentTime >= (status.duration - 0.5);

        if (nearTrackEnd && !hasTriggeredTrackEndRef.current) {
            hasTriggeredTrackEndRef.current = true;
            handleNext();
            return;
        }

        if (!nearTrackEnd || status.currentTime < Math.max(status.duration - 1, 0)) {
            hasTriggeredTrackEndRef.current = false;
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

    useEffect(() => {
        if (!store.player) return;
        store.player.setPlaybackRate(store.playbackRate);
    }, [store.player, store.playbackRate]);

    useEffect(() => {
        if (!store.player || !store.currentSong) return;

        let cancelled = false;

        const syncLockScreenState = async () => {
            if (!store.enableLockScreenControls) {
                store.player?.clearLockScreenControls();
                return;
            }

            let artworkUrl: string | undefined;
            try {
                const artworkAsset = Asset.fromModule(require('../assets/images/placeholder.png'));
                await artworkAsset.downloadAsync();
                artworkUrl = artworkAsset.localUri || artworkAsset.uri;
            } catch {
                // Ignore artwork failure for lock screen to keep playback functional
            }

            if (cancelled) return;

            const metadata = {
                title: store.currentSong?.filename,
                artist: 'Sonic Flow',
                albumTitle: 'Local Library',
                artworkUrl,
            };

            store.player?.setActiveForLockScreen(true, metadata, LOCK_SCREEN_OPTIONS);
            store.player?.updateLockScreenMetadata(metadata);
        };

        syncLockScreenState().catch((error) => {
            console.error('Lock screen sync failed:', error);
        });

        return () => {
            cancelled = true;
        };
    }, [store.player, store.currentSong?.id, store.enableLockScreenControls]);

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
        if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
            return false;
        }
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') return false;

            let allAssets: MediaLibrary.Asset[] = [];
            let hasNextPage = true;
            let endCursor: string | undefined;

            while (hasNextPage) {
                const media: MediaLibrary.PagedInfo<MediaLibrary.Asset> = await MediaLibrary.getAssetsAsync({
                    mediaType: [MediaLibrary.MediaType.audio, MediaLibrary.MediaType.video],
                    sortBy: 'creationTime',
                    first: 500,
                    after: endCursor,
                });

                allAssets = [...allAssets, ...media.assets];
                hasNextPage = media.hasNextPage;
                endCursor = media.endCursor;
            }

            const filteredAssets = allAssets.filter((asset) => {
                const filename = asset.filename.toLowerCase();
                const extension = filename.split('.').pop();
                return extension && SUPPORTED_EXTENSIONS.has(extension);
            });

            const localTracks = (
                await Promise.all(LOCAL_SCAN_ROOTS.map((root) => scanLocalDirectory(root)))
            ).flat();
            
            const merged = [...filteredAssets, ...localTracks];
            const dedupedByUri = new Map<string, MediaLibrary.Asset>();
            for (const track of merged) {
                if (!dedupedByUri.has(track.uri)) {
                    dedupedByUri.set(track.uri, track);
                }
            }
            const mergedAssets = Array.from(dedupedByUri.values());

            const state = useAudioStore.getState();
            state.setLibrary(mergedAssets);
            state.reconcileAssetReferences(mergedAssets.map((asset) => asset.id));

            if (state.currentSong) {
                const refreshedCurrent = mergedAssets.find((asset) => asset.id === state.currentSong?.id);
                if (!refreshedCurrent) {
                    state.player?.pause();
                    state.player?.remove();
                    state.setPlayer(null);
                    state.setCurrentSong(null);
                    state.setIsPlaying(false);
                    state.setQueue([]);
                    state.setCurrentIndex(-1);
                    state.setNowPlayingContext(null);
                    state.setPosition(0);
                    state.setDuration(0);
                    hasTriggeredTrackEndRef.current = false;
                } else {
                    state.setCurrentSong(refreshedCurrent);
                    const refreshedQueue = state.queue
                        .map((queued) => mergedAssets.find((asset) => asset.id === queued.id))
                        .filter(Boolean) as MediaLibrary.Asset[];
                    state.setQueue(refreshedQueue);
                    const refreshedIndex = refreshedQueue.findIndex((asset) => asset.id === refreshedCurrent.id);
                    state.setCurrentIndex(refreshedIndex);
                }
            }
            return true;
        } catch (error) {
            console.error('Error fetching audio assets:', error);
            return false;
        }
    }, []);

    const deleteSong = async (asset: MediaLibrary.Asset) => {
        try {
            return await deleteSongInternal(asset);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (message.includes("didn't grant write permission")) {
                try {
                    const allowed = await ensureDeletePermission();
                    if (!allowed) return false;

                    return await deleteSongInternal(asset, {
                        mediaLibraryPermissionGranted: true,
                    });
                } catch {
                    // fall through to default error logging
                }
            }
            console.error('Delete failed:', error);
            return false;
        }
    };

    const seekTo = async (positionSeconds: number) => {
        if (store.player) {
            hasTriggeredTrackEndRef.current = false;
            await store.player.seekTo(positionSeconds);
        }
    };

    const deleteSongs = async (assets: MediaLibrary.Asset[]) => {
        if (assets.length === 0) {
            return { success: true, deletedCount: 0, failedCount: 0 };
        }

        const localAssets = assets.filter((asset) => asset.id.startsWith('local:'));
        const mediaLibraryAssets = assets.filter((asset) => !asset.id.startsWith('local:'));
        const mediaLibraryPermissionGranted = mediaLibraryAssets.length > 0
            ? await ensureDeletePermission()
            : false;

        let deletedCount = 0;
        let shouldRefreshLibrary = false;

        for (const asset of localAssets) {
            const success = await deleteSongInternal(asset, {
                refreshAfterDelete: false,
            });
            if (success) {
                deletedCount += 1;
                shouldRefreshLibrary = true;
            }
        }

        if (mediaLibraryPermissionGranted) {
            for (const asset of mediaLibraryAssets) {
                const success = await deleteSongInternal(asset, {
                    refreshAfterDelete: false,
                    mediaLibraryPermissionGranted: true,
                });
                if (success) {
                    deletedCount += 1;
                    shouldRefreshLibrary = true;
                }
            }
        }

        if (shouldRefreshLibrary) {
            await refreshLibrary();
        }

        return {
            success: deletedCount === assets.length,
            deletedCount,
            failedCount: assets.length - deletedCount,
        };
    };

    const playFromUrl = async (url: string) => {
        const trimmed = url.trim();
        if (!/^https?:\/\//i.test(trimmed)) return false;

        try {
            const parsed = new URL(trimmed);
            const filenameFromPath = decodeURIComponent(fileNameFromUri(parsed.toString()));
            const filename = filenameFromPath && filenameFromPath !== 'track'
                ? filenameFromPath
                : `${parsed.hostname}.stream`;
            const track = trackFromUri(parsed.toString(), `remote:${parsed.toString()}`, filename, Date.now());

            store.setQueue([track]);
            store.setCurrentIndex(0);
            store.setNowPlayingContext({ type: 'remote', title: 'Stream Queue' });
            await loadAudio(track, true);
            return true;
        } catch {
            return false;
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
        deleteSongs,
        toggleLike,
        playLikedSongs,
        playPlaylist,
        startQueuePlayback,
        playFromUrl,
    };
};
