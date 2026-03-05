import * as MediaLibrary from 'expo-media-library';

export interface SuggestedPlaylist {
    id: string;
    name: string;
    subtitle: string;
    icon: 'headset' | 'moon' | 'heart' | 'sparkles';
    keywords: string[];
}

export const SUGGESTED_PLAYLISTS: SuggestedPlaylist[] = [
    {
        id: 'radio-vibe',
        name: 'Radio Vibe',
        subtitle: 'Songs with radio/night/lofi mood',
        icon: 'headset',
        keywords: ['radio', 'night', 'lofi', 'chill', 'vibe', 'slow', 'acoustic'],
    },
    {
        id: 'romantic-soft',
        name: 'Romantic Soft',
        subtitle: 'Love and mellow tracks',
        icon: 'heart',
        keywords: ['love', 'romance', 'soft', 'sad', 'ballad', 'heart'],
    },
    {
        id: 'late-night',
        name: 'Late Night',
        subtitle: 'Low-energy night listening',
        icon: 'moon',
        keywords: ['night', 'midnight', 'sleep', 'dream', 'calm', 'ambient'],
    },
];

export function getSuggestedPlaylistTracks(
    library: MediaLibrary.Asset[],
    keywords: string[],
    playlistId?: string
): MediaLibrary.Asset[] {
    const lowerKeywords = keywords.map((key) => key.toLowerCase());
    const matched = library.filter((asset) => {
        const filename = asset.filename.toLowerCase();
        const uri = (asset.uri || '').toLowerCase();
        return lowerKeywords.some((key) => filename.includes(key) || uri.includes(key));
    });

    if (matched.length > 0) return matched;

    // Fallback so suggested playlists are still usable even with unmatched file names.
    if (playlistId === 'radio-vibe') {
        return [...library].sort((a, b) => b.creationTime - a.creationTime).slice(0, 40);
    }
    if (playlistId === 'romantic-soft') {
        return [...library].sort((a, b) => b.duration - a.duration).slice(0, 30);
    }
    if (playlistId === 'late-night') {
        return [...library].sort((a, b) => a.duration - b.duration).slice(0, 35);
    }

    return library.slice(0, 30);
}
