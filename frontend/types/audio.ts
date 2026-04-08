export type TrackSource = 'library' | 'remote' | 'jiosaavn';

export type OnlineSourcePreference = 'jiosaavn' | 'local' | 'both';

export type RepeatMode = 'off' | 'one' | 'all';

export type PlaybackStatus = 'idle' | 'loading' | 'buffering' | 'playing' | 'paused' | 'ended' | 'error';

export interface AudioTrack {
    id: string;
    uri: string;
    playableUri?: string;
    source: TrackSource;
    filename: string;
    title: string;
    artist: string;
    artists: string;
    album: string;
    imageUrl?: string;
    duration: number;
    mediaType: 'audio' | 'video';
    creationTime: number;
    modificationTime: number;
    assetId?: string;
    permaUrl?: string;
    year?: string;
    language?: string;
    isLocal: boolean;
    waveform?: number[];
}

export interface QueueEntry {
    id: string;
    addedAt: number;
    track: AudioTrack;
}

export interface Playlist {
    id: string;
    name: string;
    trackIds: string[];
}

export interface PlaybackError {
    message: string;
    code?: string;
    trackId?: string;
    recoverable?: boolean;
}

export interface RecentTrack extends AudioTrack {
    playedAt: number;
}

export interface SleepTimerState {
    enabled: boolean;
    startedAt: number | null;
    endsAt: number | null;
    fadeWindowMs: number;
    presetMinutes: number | null;
}

export type NowPlayingContext = {
    type: 'library' | 'playlist' | 'liked' | 'jiosaavn' | 'remote';
    title: string;
    playlistId?: string;
} | null;

export interface DeleteTracksResult {
    success: boolean;
    deletedCount: number;
    failedCount: number;
}
