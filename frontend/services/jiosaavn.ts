import { AudioTrack } from '../types/audio';
import { normalizeTrack } from './audioTracks';

export interface JioSaavnSong {
    id: string;
    title: string;
    subtitle: string;
    artists: string;
    album: string;
    imageUrl: string;
    streamingUrl: string;
    duration: number;
    year: string;
    language: string;
    permaUrl: string;
}

interface JioSaavnSearchResult {
    results: JioSaavnSong[];
    totalResults: number;
}

const DEFAULT_API_BASE = 'https://jiosaavn-api.vercel.app';

export const mapApiResponseToSong = (item: any): JioSaavnSong => {
    try {
        if (!item) throw new Error('Empty song data');
        
        // New API format uses more_info for singers and vlink
        const moreInfo = item.more_info || {};
        
        // Artwork handling: prefer high-res from 'images' object if available
        const imageUrl = item.images?.['500x500'] || item.image || item.imageUrl || item.thumbnail || '';
        
        // Streaming URL handling: new API uses vlink, old uses mediaUrl/downloadUrl
        const streamingUrl = moreInfo.vlink || item.mediaUrl || item.streamingUrl || item.downloadUrl || item.url || '';
        
        // Artist handling: new uses singers, old uses artists/artist
        const artists = moreInfo.singers || item.artists || item.artist || item.subtitle || 'Unknown Artist';

        return {
            id: String(item.id || item.songId || ''),
            title: String(item.title || item.song || 'Unknown Title'),
            subtitle: String(moreInfo.singers || item.subtitle || item.artist || item.title || ''),
            artists: String(artists),
            album: String(item.album || item.albumName || 'Unknown Album'),
            imageUrl: String(imageUrl),
            streamingUrl: String(streamingUrl),
            duration: parseInt(item.duration, 10) || parseInt(item.time, 10) || 0,
            year: String(item.year || moreInfo.year || ''),
            language: String(item.language || moreInfo.language || 'english'),
            permaUrl: String(item.permaUrl || item.perma_url || item.link || ''),
        };
    } catch {
        return {
            id: 'error',
            title: 'Error Loading Track',
            subtitle: '',
            artists: 'Unknown',
            album: '',
            imageUrl: '',
            streamingUrl: '',
            duration: 0,
            year: '',
            language: '',
            permaUrl: '',
        };
    }
};

export const createJioSaavnClient = (baseUrl: string = DEFAULT_API_BASE) => {
    const search = async (query: string, limit: number = 20): Promise<JioSaavnSearchResult> => {
        try {
            const response = await fetch(
                `${baseUrl}/search?query=${encodeURIComponent(query)}&limit=${limit}`
            );
            
            if (!response.ok) {
                throw new Error(`JioSaavn API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            const results = Array.isArray(data.results) 
                ? data.results.slice(0, limit).map(mapApiResponseToSong)
                : Array.isArray(data)
                ? data.slice(0, limit).map(mapApiResponseToSong)
                : [];
            
            return {
                results: results.filter((s: JioSaavnSong) => s.id !== 'error'),
                totalResults: results.length,
            };
        } catch (error) {
            throw error instanceof Error ? error : new Error('JioSaavn search failed');
        }
    };

    const getSongDetails = async (songId: string): Promise<JioSaavnSong | null> => {
        try {
            const response = await fetch(
                `${baseUrl}/song?id=${encodeURIComponent(songId)}`
            );
            
            if (!response.ok) {
                throw new Error(`JioSaavn API error: ${response.status}`);
            }
            
            const data = await response.json();
            const song = mapApiResponseToSong(data);
            return song.id === 'error' ? null : song;
        } catch (error) {
            throw error instanceof Error ? error : new Error('JioSaavn track lookup failed');
        }
    };

    const getTopCharts = async (limit: number = 20): Promise<JioSaavnSong[]> => {
        try {
            const response = await fetch(
                `${baseUrl}/charts`
            );
            
            if (!response.ok) {
                throw new Error(`JioSaavn API error: ${response.status}`);
            }
            
            const data = await response.json();
            const charts = Array.isArray(data) ? data : data?.results || [];
            return charts.slice(0, limit).map(mapApiResponseToSong).filter((s: JioSaavnSong) => s.id !== 'error');
        } catch {
            return [];
        }
    };

    const getTrending = async (limit: number = 20): Promise<JioSaavnSong[]> => {
        try {
            const response = await fetch(
                `${baseUrl}/trending`
            );
            
            if (!response.ok) {
                throw new Error(`JioSaavn API error: ${response.status}`);
            }
            
            const data = await response.json();
            const results = Array.isArray(data) ? data : data?.results || [];
            return results.slice(0, limit).map(mapApiResponseToSong).filter((s: JioSaavnSong) => s.id !== 'error');
        } catch {
            return getTopCharts(limit);
        }
    };

    const toTrack = (song: JioSaavnSong): AudioTrack =>
        normalizeTrack({
            id: `jiosaavn:${song.id}`,
            uri: song.streamingUrl,
            source: 'jiosaavn',
            filename: song.title,
            title: song.title,
            artist: song.artists || 'Unknown Artist',
            artists: song.artists || 'Unknown Artist',
            album: song.album || 'JioSaavn',
            imageUrl: song.imageUrl,
            duration: song.duration,
            mediaType: 'audio',
            creationTime: Date.now(),
            modificationTime: Date.now(),
            isLocal: false,
            permaUrl: song.permaUrl,
            year: song.year,
            language: song.language,
        });

    return {
        search,
        getSongDetails,
        getTopCharts,
        getTrending,
        toTrack,
    };
};

export const jioSaavn = createJioSaavnClient();
