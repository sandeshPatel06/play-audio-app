import { Asset } from 'expo-asset';
import { AudioPlayer, AudioSample, AudioStatus, createAudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useRef } from 'react';
import { DEFAULT_ACCENT } from '../constants/colors';
import { bindAudioRuntime } from '../services/audioRuntimeController';
import {
    createRemoteTrackFromUrl,
    deriveAccentColorFromTrack,
    fileNameFromUri,
    isPlayableVideoTrack,
    isSupportedAudioFile,
    mediaAssetToTrack,
    normalizeTrack,
} from '../services/audioTracks';
import {
    AudioTrack,
    DeleteTracksResult,
    NowPlayingContext,
    PlaybackError,
    getNextPlayableIndex,
    getPreviousPlayableIndex,
    useAudioStore,
} from '../store/useAudioStore';
import { getRemainingSleepTimerMs, getSleepTimerVolume } from '../utils/sleepTimer';

const LOCAL_SCAN_MAX_DEPTH = 3;
const LOCK_SCREEN_OPTIONS = {
    showSeekBackward: true,
    showSeekForward: true,
};

const defaultContextForTrack = (track: AudioTrack): NowPlayingContext => {
    if (track.source === 'jiosaavn') {
        return { type: 'jiosaavn', title: 'JioSaavn Queue' };
    }
    if (track.source === 'remote') {
        return { type: 'remote', title: 'Direct Stream' };
    }
    return { type: 'library', title: 'Library Queue' };
};

const createFallbackWaveform = (track: AudioTrack, size = 40) => {
    const seed = `${track.id}:${track.title}:${track.artist}`;
    let hash = 2166136261;
    const samples: number[] = [];

    for (let index = 0; index < seed.length; index += 1) {
        hash ^= seed.charCodeAt(index);
        hash +=
            (hash << 1) +
            (hash << 4) +
            (hash << 7) +
            (hash << 8) +
            (hash << 24);
    }

    for (let index = 0; index < size; index += 1) {
        const raw = Math.abs(Math.sin((hash + index * 17) * 0.0001));
        samples.push(0.18 + raw * 0.82);
    }

    return samples;
};

const collapseAudioSample = (sample: AudioSample, barCount = 40) => {
    const channelFrames = sample.channels.flatMap((channel) => channel.frames);
    if (channelFrames.length === 0) {
        return [];
    }

    const windowSize = Math.max(1, Math.floor(channelFrames.length / barCount));
    const nextWaveform: number[] = [];

    for (let index = 0; index < barCount; index += 1) {
        const start = index * windowSize;
        const end = Math.min(channelFrames.length, start + windowSize);
        const slice = channelFrames.slice(start, end);
        const peak = slice.length === 0
            ? 0
            : slice.reduce((max, frame) => Math.max(max, Math.abs(frame)), 0);
        nextWaveform.push(Math.max(0.08, Math.min(1, peak)));
    }

    return nextWaveform;
};

const getScanRoots = () => {
    const fs = FileSystem as {
        documentDirectory?: string | null;
        cacheDirectory?: string | null;
    };

    return [fs.documentDirectory, fs.cacheDirectory]
        .filter(Boolean)
        .map((entry) => (entry?.endsWith('/') ? entry : `${entry}/`)) as string[];
};

const createLocalTrackFromUri = (
    uri: string,
    id: string,
    filename?: string,
    creationTime = Date.now()
) =>
    normalizeTrack({
        id,
        uri,
        source: 'library',
        filename: filename || fileNameFromUri(uri),
        creationTime,
        modificationTime: creationTime,
        isLocal: true,
    });

const scanLocalDirectory = async (root: string, depth = 0): Promise<AudioTrack[]> => {
    if (depth > LOCAL_SCAN_MAX_DEPTH) {
        return [];
    }

    const results: AudioTrack[] = [];

    try {
        const entries = await FileSystem.readDirectoryAsync(root);
        for (const entry of entries) {
            const uri = `${root}${entry}`;
            const info = await FileSystem.getInfoAsync(uri);

            if (!info.exists) {
                continue;
            }

            if (info.isDirectory) {
                const children = await scanLocalDirectory(`${uri}/`, depth + 1);
                results.push(...children);
                continue;
            }

            if (isSupportedAudioFile(uri)) {
                results.push(createLocalTrackFromUri(uri, `local:${uri}`, entry, Date.now()));
            }
        }
    } catch {
        // Ignore inaccessible folders in app-owned storage.
    }

    return results;
};

const statusToPlaybackState = (status: AudioStatus) => {
    if (!status.isLoaded) {
        return 'loading' as const;
    }
    if (status.isBuffering) {
        return 'buffering' as const;
    }
    if (status.didJustFinish) {
        return 'ended' as const;
    }
    return status.playing ? 'playing' as const : 'paused' as const;
};

export default function AudioRuntime() {
    const playbackRate = useAudioStore((state) => state.playbackRate);
    const currentTrackId = useAudioStore((state) => state.currentTrack?.id ?? null);
    const sleepTimer = useAudioStore((state) => state.sleepTimer);
    const queueVersion = useAudioStore((state) =>
        `${state.currentIndex}:${state.shuffle}:${state.repeatMode}:${state.gaplessPlaybackEnabled}:${state.crossfadeEnabled}:${state.crossfadeDurationSec}:${state.queue.map((entry) => entry.track.id).join('|')}`
    );

    const activePlayerRef = useRef<AudioPlayer | null>(null);
    const preloadedPlayerRef = useRef<AudioPlayer | null>(null);
    const preloadedTrackIdRef = useRef<string | null>(null);
    const activeStatusSubscriptionRef = useRef<{ remove: () => void } | null>(null);
    const activeSampleSubscriptionRef = useRef<{ remove: () => void } | null>(null);
    const finishHandledRef = useRef(false);
    const crossfadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const crossfadeStartedRef = useRef(false);
    const sleepTimerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const placeholderArtworkRef = useRef<string | null>(null);
    const artworkLoadingRef = useRef<Promise<string | null> | null>(null);

    const clearCrossfadeInterval = useCallback(() => {
        if (crossfadeIntervalRef.current) {
            clearInterval(crossfadeIntervalRef.current);
            crossfadeIntervalRef.current = null;
        }
        crossfadeStartedRef.current = false;
    }, []);

    const clearActiveSubscriptions = useCallback(() => {
        activeStatusSubscriptionRef.current?.remove();
        activeStatusSubscriptionRef.current = null;
        activeSampleSubscriptionRef.current?.remove();
        activeSampleSubscriptionRef.current = null;
    }, []);

    const clearPreparedPlayer = useCallback(() => {
        const prepared = preloadedPlayerRef.current;
        preloadedPlayerRef.current = null;
        preloadedTrackIdRef.current = null;

        if (!prepared) {
            return;
        }

        try {
            prepared.pause();
        } catch {
            // Player may already be released.
        }

        try {
            prepared.remove();
        } catch {
            // Player may already be released.
        }
    }, []);

    const clearActivePlayer = useCallback(() => {
        clearActiveSubscriptions();
        const active = activePlayerRef.current;
        activePlayerRef.current = null;

        if (!active) {
            return;
        }

        try {
            active.pause();
        } catch {
            // Player may already be released.
        }

        try {
            active.clearLockScreenControls();
        } catch {
            // Safe to ignore.
        }

        try {
            active.remove();
        } catch {
            // Player may already be released.
        }
    }, [clearActiveSubscriptions]);

    const loadPlaceholderArtwork = useCallback(async () => {
        if (placeholderArtworkRef.current) {
            return placeholderArtworkRef.current;
        }

        if (!artworkLoadingRef.current) {
            artworkLoadingRef.current = (async () => {
                try {
                    const artworkAsset = Asset.fromModule(require('../assets/images/placeholder.png'));
                    await artworkAsset.downloadAsync();
                    return artworkAsset.localUri || artworkAsset.uri || null;
                } catch {
                    return null;
                }
            })();
        }

        placeholderArtworkRef.current = await artworkLoadingRef.current;
        return placeholderArtworkRef.current;
    }, []);

    const updateWaveformForTrack = useCallback((track: AudioTrack) => {
        const fallback = track.waveform && track.waveform.length > 0
            ? track.waveform
            : createFallbackWaveform(track);
        useAudioStore.getState().setWaveformSamples(fallback);
    }, []);

    const updateAdaptiveAccent = useCallback((track: AudioTrack | null) => {
        useAudioStore.getState().setAdaptiveAccent(
            deriveAccentColorFromTrack(track, DEFAULT_ACCENT)
        );
    }, []);

    const resolvePlayableUri = useCallback(async (track: AudioTrack) => {
        if (track.playableUri) {
            return track.playableUri;
        }

        if (track.source !== 'library' || track.id.startsWith('local:') || track.uri.startsWith('file://')) {
            return track.uri;
        }

        try {
            const info = await MediaLibrary.getAssetInfoAsync(track.assetId || track.id, {
                shouldDownloadFromNetwork: true,
            });
            return info.localUri || info.uri || track.uri;
        } catch {
            return track.uri;
        }
    }, []);

    const syncLockScreen = useCallback(async (player: AudioPlayer, track: AudioTrack) => {
        const state = useAudioStore.getState();
        if (!state.enableLockScreenControls) {
            try {
                player.clearLockScreenControls();
            } catch {
                // Ignore lock screen cleanup issues.
            }
            return;
        }

        const artworkUrl = track.imageUrl || await loadPlaceholderArtwork();
        const metadata = {
            title: track.title,
            artist: track.artist,
            albumTitle: track.album,
            artworkUrl: artworkUrl || undefined,
        };

        try {
            player.setActiveForLockScreen(true, metadata, LOCK_SCREEN_OPTIONS);
            player.updateLockScreenMetadata(metadata);
        } catch {
            // Native lock-screen integration is best-effort.
        }
    }, [loadPlaceholderArtwork]);

    const syncTrackState = useCallback((
        track: AudioTrack | null,
        options: {
            currentIndex?: number;
            shouldPlay?: boolean;
            resetPosition?: boolean;
            error?: PlaybackError | null;
        } = {}
    ) => {
        const state = useAudioStore.getState();
        const {
            currentIndex = state.currentIndex,
            shouldPlay = state.isPlaying,
            resetPosition = true,
            error = null,
        } = options;

        state.setCurrentTrack(track);
        state.setCurrentIndex(currentIndex);
        state.setPlaybackError(error);
        state.setIsPlaying(shouldPlay);
        state.setIsBuffering(Boolean(track));
        state.setPlaybackStatus(track ? 'loading' : 'idle');

        if (resetPosition) {
            state.setPosition(0);
            state.setDuration(track?.duration || 0);
        }

        if (track) {
            state.rememberTrack(track);
            updateWaveformForTrack(track);
        } else {
            state.setWaveformSamples([]);
        }

        updateAdaptiveAccent(track);
    }, [updateAdaptiveAccent, updateWaveformForTrack]);

    const maybePrepareUpcomingTrack = useCallback(async () => {
        const state = useAudioStore.getState();
        const shouldPrepare = state.gaplessPlaybackEnabled || state.crossfadeEnabled;
        if (!shouldPrepare || state.currentIndex < 0 || state.queue.length < 2) {
            clearPreparedPlayer();
            return;
        }

        const nextIndex = getNextPlayableIndex(state);
        if (nextIndex < 0) {
            clearPreparedPlayer();
            return;
        }

        const nextTrack = state.queue[nextIndex]?.track;
        if (!nextTrack || nextTrack.id === state.currentTrack?.id) {
            clearPreparedPlayer();
            return;
        }

        if (isPlayableVideoTrack(state.currentTrack ?? nextTrack) || isPlayableVideoTrack(nextTrack)) {
            clearPreparedPlayer();
            return;
        }

        if (preloadedTrackIdRef.current === nextTrack.id && preloadedPlayerRef.current) {
            return;
        }

        clearPreparedPlayer();

        try {
            const playableUri = await resolvePlayableUri(nextTrack);
            const prepared = createAudioPlayer(playableUri, {
                keepAudioSessionActive: true,
                updateInterval: 250,
                downloadFirst: !nextTrack.isLocal,
            });
            prepared.volume = 0;
            prepared.playbackRate = state.playbackRate;
            prepared.pause();
            preloadedPlayerRef.current = prepared;
            preloadedTrackIdRef.current = nextTrack.id;
        } catch {
            clearPreparedPlayer();
        }
    }, [clearPreparedPlayer, resolvePlayableUri]);

    const attachActivePlayerListeners = useCallback((player: AudioPlayer) => {
        clearActiveSubscriptions();

        activeStatusSubscriptionRef.current = player.addListener('playbackStatusUpdate', (status) => {
            const state = useAudioStore.getState();
            state.setPosition(status.currentTime);
            state.setDuration(status.duration || state.currentTrack?.duration || 0);
            state.setIsPlaying(status.playing);
            state.setIsBuffering(status.isBuffering);
            state.setPlaybackStatus(statusToPlaybackState(status));

            if (status.currentTime < Math.max((status.duration || 0) - 1, 0)) {
                finishHandledRef.current = false;
            }

            if (
                state.crossfadeEnabled &&
                !crossfadeStartedRef.current &&
                preloadedPlayerRef.current &&
                preloadedTrackIdRef.current &&
                !(state.currentTrack && isPlayableVideoTrack(state.currentTrack)) &&
                status.playing &&
                status.duration > 0 &&
                status.duration - status.currentTime <= state.crossfadeDurationSec
            ) {
                crossfadeStartedRef.current = true;
                const nextIndex = getNextPlayableIndex(state);
                const nextTrack = nextIndex >= 0 ? state.queue[nextIndex]?.track : null;
                const prepared = preloadedPlayerRef.current;

                if (nextTrack && prepared) {
                    prepared.volume = 0;
                    prepared.playbackRate = state.playbackRate;
                    prepared.play();

                    const previousPlayer = activePlayerRef.current;
                    const fadeSteps = Math.max(12, state.crossfadeDurationSec * 8);
                    const fadeStepMs = Math.max(50, Math.floor((state.crossfadeDurationSec * 1000) / fadeSteps));
                    let step = 0;

                    clearCrossfadeInterval();
                    crossfadeStartedRef.current = true;

                    crossfadeIntervalRef.current = setInterval(() => {
                        step += 1;
                        const progress = Math.min(1, step / fadeSteps);
                        if (previousPlayer) {
                            previousPlayer.volume = Math.max(0, 1 - progress);
                        }
                        prepared.volume = progress;

                        if (progress >= 1) {
                            clearCrossfadeInterval();
                            void (async () => {
                                if (previousPlayer && previousPlayer !== prepared) {
                                    try {
                                        previousPlayer.pause();
                                        previousPlayer.remove();
                                    } catch {
                                        // Safe to ignore during player handoff.
                                    }
                                }

                                activePlayerRef.current = prepared;
                                preloadedPlayerRef.current = null;
                                preloadedTrackIdRef.current = null;
                                attachActivePlayerListeners(prepared);
                                syncTrackState(nextTrack, {
                                    currentIndex: nextIndex,
                                    shouldPlay: true,
                                    resetPosition: true,
                                });
                                await syncLockScreen(prepared, nextTrack);
                                useAudioStore.getState().recordRecentlyPlayed(nextTrack);
                                await maybePrepareUpcomingTrack();
                            })();
                        }
                    }, fadeStepMs);
                } else {
                    crossfadeStartedRef.current = false;
                }
            }

            if (status.didJustFinish && !finishHandledRef.current && !crossfadeStartedRef.current) {
                finishHandledRef.current = true;
                void audioRuntimeApiRef.current.next();
            }
        });

        activeSampleSubscriptionRef.current = player.addListener('audioSampleUpdate', (sample) => {
            const state = useAudioStore.getState();
            if (!state.currentTrack?.isLocal) {
                return;
            }

            const collapsed = collapseAudioSample(sample);
            if (collapsed.length > 0) {
                state.setWaveformSamples(collapsed);
            }
        });
    }, [clearActiveSubscriptions, clearCrossfadeInterval, maybePrepareUpcomingTrack, syncLockScreen, syncTrackState]);

    const stopPlayback = useCallback(async () => {
        clearCrossfadeInterval();
        clearPreparedPlayer();
        clearActivePlayer();
        finishHandledRef.current = false;
        useAudioStore.getState().clearPlayback();
    }, [clearActivePlayer, clearCrossfadeInterval, clearPreparedPlayer]);

    const loadTrack = useCallback(async (
        track: AudioTrack,
        shouldPlay = true,
        indexOverride?: number
    ) => {
        const state = useAudioStore.getState();
        const currentIndex = typeof indexOverride === 'number'
            ? indexOverride
            : state.queue.findIndex((entry) => entry.track.id === track.id);
        const normalizedTrack = normalizeTrack(track);

        syncTrackState(normalizedTrack, {
            currentIndex,
            shouldPlay,
            resetPosition: true,
        });
        finishHandledRef.current = false;
        clearCrossfadeInterval();

        const prepared = preloadedTrackIdRef.current === normalizedTrack.id
            ? preloadedPlayerRef.current
            : null;

        try {
            if (prepared) {
                const previousPlayer = activePlayerRef.current;
                activePlayerRef.current = prepared;
                preloadedPlayerRef.current = null;
                preloadedTrackIdRef.current = null;
                prepared.volume = 1;
                prepared.playbackRate = state.playbackRate;
                attachActivePlayerListeners(prepared);
                await syncLockScreen(prepared, normalizedTrack);
                if (shouldPlay) {
                    prepared.play();
                } else {
                    prepared.pause();
                }

                if (previousPlayer && previousPlayer !== prepared) {
                    try {
                        previousPlayer.pause();
                        previousPlayer.remove();
                    } catch {
                        // Safe to ignore.
                    }
                }
            } else {
                const playableUri = await resolvePlayableUri(normalizedTrack);
                const resolvedTrack = playableUri === normalizedTrack.uri
                    ? normalizedTrack
                    : { ...normalizedTrack, playableUri };
                const activePlayer = activePlayerRef.current;

                if (!activePlayer) {
                    const player = createAudioPlayer(playableUri, {
                        keepAudioSessionActive: true,
                        updateInterval: 250,
                        downloadFirst: !resolvedTrack.isLocal,
                    });
                    activePlayerRef.current = player;
                    attachActivePlayerListeners(player);
                } else {
                    activePlayer.replace(playableUri);
                }

                const player = activePlayerRef.current;
                if (!player) {
                    throw new Error('Audio player was not created');
                }

                player.playbackRate = state.playbackRate;
                player.volume = 1;

                try {
                    player.setAudioSamplingEnabled(Boolean(resolvedTrack.isLocal && resolvedTrack.mediaType === 'audio'));
                } catch {
                    // Sampling is best-effort only.
                }

                await syncLockScreen(player, resolvedTrack);
                if (shouldPlay) {
                    player.play();
                } else {
                    player.pause();
                }
                syncTrackState(resolvedTrack, {
                    currentIndex,
                    shouldPlay,
                    resetPosition: true,
                });
            }

            const nextState = useAudioStore.getState();
            nextState.setPlaybackError(null);
            nextState.setIsBuffering(false);
            nextState.setPlaybackStatus(shouldPlay ? 'playing' : 'paused');
            nextState.recordRecentlyPlayed(normalizedTrack);
            await maybePrepareUpcomingTrack();
            return true;
        } catch (error) {
            const playbackError: PlaybackError = {
                message: error instanceof Error ? error.message : 'Playback failed',
                trackId: normalizedTrack.id,
                recoverable: true,
            };
            const latestState = useAudioStore.getState();
            latestState.setPlaybackError(playbackError);
            latestState.setPlaybackStatus('error');
            latestState.setIsBuffering(false);
            latestState.setIsPlaying(false);
            return false;
        }
    }, [attachActivePlayerListeners, clearCrossfadeInterval, maybePrepareUpcomingTrack, resolvePlayableUri, syncLockScreen, syncTrackState]);

    const refreshLibrary = useCallback(async () => {
        const state = useAudioStore.getState();
        state.setLibraryScanStatus('scanning');

        try {
            const permission = await MediaLibrary.requestPermissionsAsync();
            const granted = permission.status === 'granted';
            state.setPermissionGranted(granted);

            if (!granted) {
                state.setLibraryScanStatus('error');
                return false;
            }

            let allAssets: MediaLibrary.Asset[] = [];
            let hasNextPage = true;
            let endCursor: string | undefined;

            while (hasNextPage) {
                const media = await MediaLibrary.getAssetsAsync({
                    mediaType: [MediaLibrary.MediaType.audio, MediaLibrary.MediaType.video],
                    sortBy: 'creationTime',
                    first: 500,
                    after: endCursor,
                });

                allAssets = [...allAssets, ...media.assets];
                hasNextPage = media.hasNextPage;
                endCursor = media.endCursor;
            }

            const mediaTracks = allAssets
                .filter((asset) => isSupportedAudioFile(asset.uri || asset.filename))
                .map((asset) => mediaAssetToTrack(asset as MediaLibrary.Asset & Record<string, any>));
            const localTracks = (
                await Promise.all(getScanRoots().map((root) => scanLocalDirectory(root)))
            ).flat();

            const dedupedByUri = new Map<string, AudioTrack>();
            [...mediaTracks, ...localTracks].forEach((track) => {
                if (!dedupedByUri.has(track.uri)) {
                    dedupedByUri.set(track.uri, track);
                }
            });

            const library = Array.from(dedupedByUri.values());
            state.rememberTracks(library);
            state.reconcileTrackReferences(library);
            state.setLibrary(library);
            state.setLibraryScanStatus('ready');

            const currentTrack = useAudioStore.getState().currentTrack;
            if (!currentTrack) {
                await stopPlayback();
                state.setLibrary(library);
                state.setLibraryScanStatus('ready');
            } else {
                const refreshedCurrent = library.find((track) => track.id === currentTrack.id);
                if (refreshedCurrent) {
                    state.setCurrentTrack(refreshedCurrent);
                    updateWaveformForTrack(refreshedCurrent);
                    updateAdaptiveAccent(refreshedCurrent);
                }
            }

            return true;
        } catch {
            useAudioStore.getState().setLibraryScanStatus('error');
            return false;
        }
    }, [stopPlayback, updateAdaptiveAccent, updateWaveformForTrack]);

    const replaceQueue = useCallback(async (
        tracks: AudioTrack[],
        startIndex = 0,
        context: NowPlayingContext = { type: 'library', title: 'Library Queue' },
        shouldPlay = true
    ) => {
        const normalizedTracks = tracks.map((track) => normalizeTrack(track));
        const state = useAudioStore.getState();

        if (normalizedTracks.length === 0) {
            await stopPlayback();
            return false;
        }

        state.rememberTracks(normalizedTracks);
        state.replaceQueueState(normalizedTracks, startIndex, context);
        const safeIndex = Math.min(Math.max(startIndex, 0), normalizedTracks.length - 1);
        return loadTrack(normalizedTracks[safeIndex], shouldPlay, safeIndex);
    }, [loadTrack, stopPlayback]);

    const selectQueueItem = useCallback(async (index: number) => {
        const state = useAudioStore.getState();
        const entry = state.queue[index];
        if (!entry) {
            return;
        }

        await loadTrack(entry.track, true, index);
    }, [loadTrack]);

    const next = useCallback(async () => {
        const state = useAudioStore.getState();
        if (state.queue.length === 0) {
            return;
        }

        const nextIndex = getNextPlayableIndex(state);
        if (nextIndex < 0) {
            await stopPlayback();
            return;
        }

        const nextTrack = state.queue[nextIndex]?.track;
        if (!nextTrack) {
            await stopPlayback();
            return;
        }

        await loadTrack(nextTrack, true, nextIndex);
    }, [loadTrack, stopPlayback]);

    const previous = useCallback(async () => {
        const state = useAudioStore.getState();
        const activePlayer = activePlayerRef.current;

        if (activePlayer && state.position > 3) {
            finishHandledRef.current = false;
            await activePlayer.seekTo(0);
            state.setPosition(0);
            return;
        }

        const previousIndex = getPreviousPlayableIndex(state);
        if (previousIndex < 0) {
            return;
        }

        const previousTrack = state.queue[previousIndex]?.track;
        if (!previousTrack) {
            return;
        }

        await loadTrack(previousTrack, true, previousIndex);
    }, [loadTrack]);

    const removeQueueItem = useCallback(async (index: number) => {
        const state = useAudioStore.getState();
        const result = state.removeQueueItem(index);

        if (result.removedCurrent) {
            if (result.nextIndex >= 0) {
                const nextTrack = useAudioStore.getState().queue[result.nextIndex]?.track;
                if (nextTrack) {
                    await loadTrack(nextTrack, true, result.nextIndex);
                    return;
                }
            }

            await stopPlayback();
            return;
        }

        await maybePrepareUpcomingTrack();
    }, [loadTrack, maybePrepareUpcomingTrack, stopPlayback]);

    const deleteTracks = useCallback(async (tracks: AudioTrack[]): Promise<DeleteTracksResult> => {
        if (tracks.length === 0) {
            return { success: true, deletedCount: 0, failedCount: 0 };
        }

        let deletedCount = 0;

        for (const track of tracks) {
            try {
                if (track.id.startsWith('local:') && track.uri.startsWith('file://')) {
                    await FileSystem.deleteAsync(track.uri, { idempotent: true });
                } else {
                    const deleted = await MediaLibrary.deleteAssetsAsync(track.assetId || track.id);
                    if (!deleted) {
                        continue;
                    }
                }

                deletedCount += 1;
            } catch {
                // Continue and report aggregate result.
            }
        }

        if (tracks.some((track) => track.id === useAudioStore.getState().currentTrack?.id)) {
            await stopPlayback();
        }

        await refreshLibrary();

        return {
            success: deletedCount === tracks.length,
            deletedCount,
            failedCount: tracks.length - deletedCount,
        };
    }, [refreshLibrary, stopPlayback]);

    const deleteTrack = useCallback(async (track: AudioTrack) => {
        const result = await deleteTracks([track]);
        return result.deletedCount > 0;
    }, [deleteTracks]);

    type AudioRuntimeBindings = {
        playTrack: (track: AudioTrack, shouldPlay?: boolean) => Promise<boolean>;
        replaceQueue: (
            tracks: AudioTrack[],
            startIndex?: number,
            context?: NowPlayingContext,
            shouldPlay?: boolean
        ) => Promise<boolean>;
        playPause: () => Promise<void>;
        next: () => Promise<void>;
        previous: () => Promise<void>;
        seekTo: (seconds: number) => Promise<void>;
        selectQueueItem: (index: number) => Promise<void>;
        enqueueTracks: (tracks: AudioTrack[], position: 'next' | 'end') => Promise<void>;
        moveQueueItem: (from: number, to: number) => Promise<void>;
        removeQueueItem: (index: number) => Promise<void>;
        refreshLibrary: () => Promise<boolean>;
        deleteTrack: (track: AudioTrack) => Promise<boolean>;
        deleteTracks: (tracks: AudioTrack[]) => Promise<DeleteTracksResult>;
        playFromUrl: (url: string) => Promise<boolean>;
        stop: () => Promise<void>;
    };

    const audioRuntimeApiRef = useRef<AudioRuntimeBindings>({
        playTrack: async (_track: AudioTrack, _shouldPlay = true) => false,
        replaceQueue: async (
            _tracks: AudioTrack[],
            _startIndex = 0,
            _context: NowPlayingContext = { type: 'library', title: 'Library Queue' },
            _shouldPlay = true
        ) => false,
        playPause: async () => undefined,
        next: async () => undefined,
        previous: async () => undefined,
        seekTo: async (_seconds: number) => undefined,
        selectQueueItem: async (_index: number) => undefined,
        enqueueTracks: async (_tracks: AudioTrack[], _position: 'next' | 'end') => undefined,
        moveQueueItem: async (_from: number, _to: number) => undefined,
        removeQueueItem: async (_index: number) => undefined,
        refreshLibrary: async () => false,
        deleteTrack: async (_track: AudioTrack) => false,
        deleteTracks: async (_tracks: AudioTrack[]) => ({ success: false, deletedCount: 0, failedCount: 0 }),
        playFromUrl: async (_url: string) => false,
        stop: async () => {},
    });

    useEffect(() => {
        audioRuntimeApiRef.current = {
            playTrack: async (track, shouldPlay = true) => {
                const state = useAudioStore.getState();
                const queueIndex = state.queue.findIndex((entry) => entry.track.id === track.id);

                if (queueIndex < 0) {
                    state.rememberTrack(track);
                    state.replaceQueueState([track], 0, defaultContextForTrack(track));
                    return loadTrack(track, shouldPlay, 0);
                }

                return loadTrack(track, shouldPlay, queueIndex);
            },
            replaceQueue,
            playPause: async () => {
                const activePlayer = activePlayerRef.current;
                const state = useAudioStore.getState();

                if (!activePlayer) {
                    if (state.currentTrack) {
                        await loadTrack(state.currentTrack, !state.isPlaying, state.currentIndex);
                    }
                    return;
                }

                clearCrossfadeInterval();
                finishHandledRef.current = false;

                if (state.isPlaying) {
                    activePlayer.pause();
                    state.setIsPlaying(false);
                    state.setPlaybackStatus('paused');
                } else {
                    activePlayer.play();
                    state.setIsPlaying(true);
                    state.setPlaybackStatus('playing');
                }
            },
            next,
            previous,
            seekTo: async (seconds) => {
                const activePlayer = activePlayerRef.current;
                if (!activePlayer) {
                    return;
                }

                finishHandledRef.current = false;
                clearCrossfadeInterval();
                await activePlayer.seekTo(seconds);
                useAudioStore.getState().setPosition(seconds);
            },
            selectQueueItem,
            enqueueTracks: async (tracks, position) => {
                const normalizedTracks = tracks.map((track) => normalizeTrack(track));
                const state = useAudioStore.getState();
                state.rememberTracks(normalizedTracks);
                state.enqueueTracks(normalizedTracks, position);
                await maybePrepareUpcomingTrack();
            },
            moveQueueItem: async (from, to) => {
                useAudioStore.getState().moveQueueItem(from, to);
                await maybePrepareUpcomingTrack();
            },
            removeQueueItem,
            refreshLibrary,
            deleteTrack,
            deleteTracks,
            playFromUrl: async (url) => {
                const trimmed = url.trim();
                if (!/^https?:\/\//i.test(trimmed)) {
                    return false;
                }

                try {
                    const parsed = new URL(trimmed);
                    const track = createRemoteTrackFromUrl(parsed.toString());
                    return replaceQueue([track], 0, { type: 'remote', title: 'Direct Stream' }, true);
                } catch {
                    return false;
                }
            },
            stop: stopPlayback,
        };

        const unbind = bindAudioRuntime(audioRuntimeApiRef.current);
        return () => {
            unbind();
        };
    }, [
        clearCrossfadeInterval,
        deleteTrack,
        deleteTracks,
        loadTrack,
        maybePrepareUpcomingTrack,
        next,
        previous,
        refreshLibrary,
        removeQueueItem,
        replaceQueue,
        selectQueueItem,
        stopPlayback,
    ]);

    useEffect(() => {
        if (activePlayerRef.current) {
            activePlayerRef.current.playbackRate = playbackRate;
        }
        if (preloadedPlayerRef.current) {
            preloadedPlayerRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    useEffect(() => {
        void maybePrepareUpcomingTrack();
    }, [currentTrackId, maybePrepareUpcomingTrack, queueVersion]);

    useEffect(() => {
        if (!sleepTimer.enabled || !sleepTimer.endsAt) {
            if (sleepTimerIntervalRef.current) {
                clearInterval(sleepTimerIntervalRef.current);
                sleepTimerIntervalRef.current = null;
            }
            if (activePlayerRef.current) {
                activePlayerRef.current.volume = 1;
            }
            return;
        }

        sleepTimerIntervalRef.current = setInterval(() => {
            const now = Date.now();
            const remainingMs = getRemainingSleepTimerMs(sleepTimer, now);
            const player = activePlayerRef.current;

            if (!player) {
                return;
            }

            if (remainingMs !== null && remainingMs <= 0) {
                void (async () => {
                    await stopPlayback();
                    useAudioStore.getState().cancelSleepTimer();
                })();
                return;
            }

            player.volume = getSleepTimerVolume(sleepTimer, now);
        }, 1000);

        return () => {
            if (sleepTimerIntervalRef.current) {
                clearInterval(sleepTimerIntervalRef.current);
                sleepTimerIntervalRef.current = null;
            }
        };
    }, [sleepTimer, stopPlayback]);

    useEffect(() => () => {
        if (sleepTimerIntervalRef.current) {
            clearInterval(sleepTimerIntervalRef.current);
        }
        clearCrossfadeInterval();
        clearPreparedPlayer();
        clearActivePlayer();
    }, [clearActivePlayer, clearCrossfadeInterval, clearPreparedPlayer]);

    return null;
}
