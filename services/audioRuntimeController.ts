import { AudioTrack, DeleteTracksResult, NowPlayingContext } from '../types/audio';

type AudioRuntimeApi = {
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

const unresolved = async () => undefined;

let runtime: AudioRuntimeApi = {
    playTrack: async () => false,
    replaceQueue: async () => false,
    playPause: unresolved,
    next: unresolved,
    previous: unresolved,
    seekTo: unresolved,
    selectQueueItem: unresolved,
    enqueueTracks: unresolved,
    moveQueueItem: unresolved,
    removeQueueItem: unresolved,
    refreshLibrary: async () => false,
    deleteTrack: async () => false,
    deleteTracks: async () => ({ success: false, deletedCount: 0, failedCount: 0 }),
    playFromUrl: async () => false,
    stop: unresolved,
};

export const bindAudioRuntime = (api: AudioRuntimeApi) => {
    runtime = api;
    return () => {
        runtime = {
            playTrack: async () => false,
            replaceQueue: async () => false,
            playPause: unresolved,
            next: unresolved,
            previous: unresolved,
            seekTo: unresolved,
            selectQueueItem: unresolved,
            enqueueTracks: unresolved,
            moveQueueItem: unresolved,
            removeQueueItem: unresolved,
            refreshLibrary: async () => false,
            deleteTrack: async () => false,
            deleteTracks: async () => ({ success: false, deletedCount: 0, failedCount: 0 }),
            playFromUrl: async () => false,
            stop: unresolved,
        };
    };
};

export const audioRuntimeController = {
    playTrack: (track: AudioTrack, shouldPlay = true) => runtime.playTrack(track, shouldPlay),
    replaceQueue: (
        tracks: AudioTrack[],
        startIndex = 0,
        context: NowPlayingContext = { type: 'library', title: 'Library Queue' },
        shouldPlay = true
    ) => runtime.replaceQueue(tracks, startIndex, context, shouldPlay),
    playPause: () => runtime.playPause(),
    next: () => runtime.next(),
    previous: () => runtime.previous(),
    seekTo: (seconds: number) => runtime.seekTo(seconds),
    selectQueueItem: (index: number) => runtime.selectQueueItem(index),
    enqueueTracks: (tracks: AudioTrack[], position: 'next' | 'end') => runtime.enqueueTracks(tracks, position),
    moveQueueItem: (from: number, to: number) => runtime.moveQueueItem(from, to),
    removeQueueItem: (index: number) => runtime.removeQueueItem(index),
    refreshLibrary: () => runtime.refreshLibrary(),
    deleteTrack: (track: AudioTrack) => runtime.deleteTrack(track),
    deleteTracks: (tracks: AudioTrack[]) => runtime.deleteTracks(tracks),
    playFromUrl: (url: string) => runtime.playFromUrl(url),
    stop: () => runtime.stop(),
};
