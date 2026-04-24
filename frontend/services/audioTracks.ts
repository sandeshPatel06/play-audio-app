import * as MediaLibrary from 'expo-media-library';
import { ACCENT_COLORS } from '../constants/colors';
import { AudioTrack } from '../types/audio';

export const SUPPORTED_EXTENSIONS = new Set([
    'mp3', 'aac', 'm4a', 'wav', 'aiff', 'aif', 'flac',
    'alac', 'ogg', 'opus', 'wma', 'amr', 'mid', 'midi',
    'mp4', 'm4v', 'mov', 'webm',
    'dsf', 'dff', 'pcm',
]);

export const fileNameFromUri = (uri: string) => {
    const cleanUri = uri.split('?')[0];
    return cleanUri.substring(cleanUri.lastIndexOf('/') + 1) || 'track';
};

export const isVideoExtension = (extension?: string | null) =>
    !!extension && ['mp4', 'm4v', 'mov', 'webm', 'm3u8'].includes(extension.toLowerCase());

export const isPlayableVideoTrack = (track: Pick<AudioTrack, 'filename' | 'uri' | 'mediaType'>) =>
    track.mediaType === 'video' ||
    /\.(mp4|m4v|mov|webm|m3u8)(\?.*)?$/i.test(`${track.filename} ${track.uri}`);

export const isSupportedAudioFile = (uri: string) => {
    const filename = fileNameFromUri(uri).toLowerCase();
    const extension = filename.split('.').pop();
    return !!extension && SUPPORTED_EXTENSIONS.has(extension);
};

export const normalizeTrack = (partial: Partial<AudioTrack> & Pick<AudioTrack, 'id' | 'uri' | 'source'>): AudioTrack => {
    const filename = partial.filename || fileNameFromUri(partial.uri);
    const title = partial.title || filename.replace(/\.[^.]+$/, '');
    const artist = partial.artist || partial.artists || 'Unknown Artist';
    const album = partial.album || 'Unknown Album';
    const extension = filename.toLowerCase().split('.').pop();
    const mediaType = partial.mediaType || (isVideoExtension(extension) ? 'video' : 'audio');
    const creationTime = partial.creationTime ?? Date.now();
    const modificationTime = partial.modificationTime ?? creationTime;

    return {
        id: partial.id,
        uri: partial.uri,
        playableUri: partial.playableUri || partial.uri,
        source: partial.source,
        filename,
        title,
        artist,
        artists: partial.artists || artist,
        album,
        imageUrl: partial.imageUrl,
        duration: partial.duration ?? 0,
        mediaType,
        creationTime,
        modificationTime,
        assetId: partial.assetId,
        permaUrl: partial.permaUrl,
        year: partial.year,
        language: partial.language,
        isLocal: partial.isLocal ?? partial.source === 'library',
        waveform: partial.waveform,
    };
};

export const mediaAssetToTrack = (asset: MediaLibrary.Asset & Record<string, any>): AudioTrack =>
    normalizeTrack({
        id: asset.id,
        uri: asset.uri,
        source: 'library',
        filename: asset.filename,
        title: asset.filename.replace(/\.[^.]+$/, ''),
        artist: asset.artist || asset.artists || 'Unknown Artist',
        artists: asset.artists || asset.artist || 'Unknown Artist',
        album: asset.album || 'Files',
        imageUrl: asset.imageUrl,
        duration: asset.duration || 0,
        mediaType: asset.mediaType === MediaLibrary.MediaType.video ? 'video' : 'audio',
        creationTime: asset.creationTime,
        modificationTime: asset.modificationTime,
        assetId: asset.id,
        isLocal: !asset.id.startsWith('jiosaavn:') && !asset.id.startsWith('remote:'),
    });

export const createRemoteTrackFromUrl = (url: string) =>
    normalizeTrack({
        id: `remote:${url}`,
        uri: url,
        source: 'remote',
        filename: fileNameFromUri(url),
        title: fileNameFromUri(url).replace(/\.[^.]+$/, ''),
        album: 'Direct Stream',
        isLocal: false,
    });

const adaptiveAccentPalette = Object.values(ACCENT_COLORS);

export const deriveAccentColorFromTrack = (track: AudioTrack | null, fallback: string) => {
    if (!track) {
        return fallback;
    }

    const seed = `${track.imageUrl || ''}:${track.title}:${track.artist}:${track.id}`;
    if (!seed.trim()) {
        return fallback;
    }

    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
        hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
    }

    return adaptiveAccentPalette[hash % adaptiveAccentPalette.length] || fallback;
};
