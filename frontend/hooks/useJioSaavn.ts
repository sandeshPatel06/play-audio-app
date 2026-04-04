import { useCallback, useState } from 'react';
import { jioSaavn, JioSaavnSong } from '../services/jiosaavn';
import { useAudioStore } from '../store/useAudioStore';
import * as MediaLibrary from 'expo-media-library';

export const useJioSaavnSearch = () => {
    const [results, setResults] = useState<JioSaavnSong[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const search = useCallback(async (query: string) => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const searchResults = await jioSaavn.search(query, 20);
            setResults(searchResults.results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed');
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const clearResults = useCallback(() => {
        setResults([]);
        setError(null);
    }, []);

    return {
        results,
        loading,
        error,
        search,
        clearResults,
    };
};

export const useJioSaavnPlayer = () => {
    const store = useAudioStore();

    const playSong = useCallback(async (song: JioSaavnSong) => {
        const asset: MediaLibrary.Asset = {
            id: `jiosaavn:${song.id}`,
            uri: song.streamingUrl,
            filename: song.title,
            mediaType: MediaLibrary.MediaType.audio,
            creationTime: Date.now(),
            modificationTime: Date.now(),
            duration: song.duration,
            width: 0,
            height: 0,
        };

        store.setQueue([asset]);
        store.setCurrentIndex(0);
        store.setNowPlayingContext({ type: 'jiosaavn', title: song.title });
        store.setCurrentSong(asset);
        store.setIsPlaying(true);

        const { createAudioPlayer } = await import('expo-audio');
        const player = createAudioPlayer(song.streamingUrl);
        store.setPlayer(player);
        player.play();
    }, [store]);

    const playAll = useCallback(async (songs: JioSaavnSong[], startIndex = 0) => {
        const assets: MediaLibrary.Asset[] = songs.map((song) => ({
            id: `jiosaavn:${song.id}`,
            uri: song.streamingUrl,
            filename: song.title,
            mediaType: MediaLibrary.MediaType.audio,
            creationTime: Date.now(),
            modificationTime: Date.now(),
            duration: song.duration,
            width: 0,
            height: 0,
        }));

        store.setQueue(assets);
        store.setCurrentIndex(startIndex);
        store.setNowPlayingContext({ type: 'jiosaavn', title: 'JioSaavn Queue' });
        
        if (assets.length > 0) {
            store.setCurrentSong(assets[startIndex]);
            store.setIsPlaying(true);

            const { createAudioPlayer } = await import('expo-audio');
            const player = createAudioPlayer(assets[startIndex].uri);
            store.setPlayer(player);
            player.play();
        }
    }, [store]);

    return {
        playSong,
        playAll,
    };
};