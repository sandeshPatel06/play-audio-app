import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { audioRuntimeController } from '../services/audioRuntimeController';
import { jioSaavn, JioSaavnSong } from '../services/jiosaavn';

const SEARCH_CACHE_PREFIX = 'play.jiosaavn.search.';
const SEARCH_LIMIT = 20;

type CachedValue<T> = {
    value: T;
    updatedAt: number;
};

const readCache = async <T,>(key: string) => {
    try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw) as CachedValue<T>;
    } catch {
        return null;
    }
};

const writeCache = async <T,>(key: string, value: T) => {
    try {
        await AsyncStorage.setItem(
            key,
            JSON.stringify({
                value,
                updatedAt: Date.now(),
            } satisfies CachedValue<T>)
        );
    } catch {
        // Cache writes are best-effort only.
    }
};

const normalizeQuery = (query: string) => query.trim().toLowerCase();

export const useJioSaavnSearch = (initialQuery = '') => {
    const [query, setQuery] = useState(initialQuery);
    const normalizedQuery = normalizeQuery(query);
    const cacheKey = `${SEARCH_CACHE_PREFIX}${normalizedQuery}`;

    const searchQuery = useQuery({
        queryKey: ['jiosaavn', 'search', normalizedQuery],
        enabled: normalizedQuery.length >= 2,
        staleTime: 2 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        retry: 1,
        queryFn: async () => {
            try {
                const response = await jioSaavn.search(normalizedQuery, SEARCH_LIMIT);
                await writeCache(cacheKey, response.results);
                return response.results;
            } catch (error) {
                const cached = await readCache<JioSaavnSong[]>(cacheKey);
                if (cached?.value) {
                    return cached.value;
                }
                throw error;
            }
        },
    });

    const search = useCallback((nextQuery: string) => {
        setQuery(nextQuery);
    }, []);

    const clearResults = useCallback(() => {
        setQuery('');
    }, []);

    return {
        query,
        results: searchQuery.data || [],
        loading: searchQuery.isLoading || searchQuery.isFetching,
        error: searchQuery.error instanceof Error ? searchQuery.error.message : null,
        search,
        clearResults,
    };
};


export const useJioSaavnPlayer = () => {
    const playSong = useCallback(async (song: JioSaavnSong) => {
        const track = jioSaavn.toTrack(song);
        return audioRuntimeController.replaceQueue([track], 0, { type: 'jiosaavn', title: song.title }, true);
    }, []);

    const playAll = useCallback(async (songs: JioSaavnSong[], startIndex = 0) => {
        if (!songs || songs.length === 0) {
            return false;
        }

        const tracks = songs.map((song) => jioSaavn.toTrack(song));
        return audioRuntimeController.replaceQueue(
            tracks,
            startIndex,
            { type: 'jiosaavn', title: 'JioSaavn Queue' },
            true
        );
    }, []);

    return useMemo(() => ({
        playSong,
        playAll,
    }), [playAll, playSong]);
};
