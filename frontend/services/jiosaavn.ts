import { Asset } from 'expo-media-library';

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

export interface JioSaavnSearchResult {
    results: JioSaavnSong[];
    totalResults: number;
}

const DEFAULT_API_BASE = 'https://jiosaavn-api.vercel.app';

const mapApiResponseToSong = (item: any): JioSaavnSong => {
    // New API format uses more_info for singers and vlink
    const moreInfo = item.more_info || {};
    
    // Artwork handling: prefer high-res from 'images' object if available
    const imageUrl = item.images?.['500x500'] || item.image || item.imageUrl || item.thumbnail || '';
    
    // Streaming URL handling: new API uses vlink, old uses mediaUrl/downloadUrl
    const streamingUrl = moreInfo.vlink || item.mediaUrl || item.streamingUrl || item.downloadUrl || item.url || '';
    
    // Artist handling: new uses singers, old uses artists/artist
    const artists = moreInfo.singers || item.artists || item.artist || item.subtitle || 'Unknown Artist';

    return {
        id: item.id || item.songId || '',
        title: item.title || item.song || '',
        subtitle: moreInfo.singers || item.subtitle || item.artist || item.title || '',
        artists,
        album: item.album || item.albumName || '',
        imageUrl,
        streamingUrl,
        duration: parseInt(item.duration, 10) || parseInt(item.time, 10) || 0,
        year: item.year || moreInfo.year || '',
        language: item.language || moreInfo.language || 'english',
        permaUrl: item.permaUrl || item.perma_url || item.link || '',
    };
};

export const createJioSaavnClient = (baseUrl: string = DEFAULT_API_BASE) => {
    const search = async (query: string, limit: number = 20): Promise<JioSaavnSearchResult> => {
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
            results,
            totalResults: results.length,
        };
    };

    const getSongDetails = async (songId: string): Promise<JioSaavnSong | null> => {
        const response = await fetch(
            `${baseUrl}/song?id=${encodeURIComponent(songId)}`
        );
        
        if (!response.ok) {
            throw new Error(`JioSaavn API error: ${response.status}`);
        }
        
        const data = await response.json();
        return mapApiResponseToSong(data);
    };

    const getTopCharts = async (limit: number = 20): Promise<JioSaavnSong[]> => {
        const response = await fetch(
            `${baseUrl}/charts`
        );
        
        if (!response.ok) {
            throw new Error(`JioSaavn API error: ${response.status}`);
        }
        
        const data = await response.json();
        const charts = Array.isArray(data) ? data : data?.results || [];
        return charts.slice(0, limit).map(mapApiResponseToSong);
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
            return results.slice(0, limit).map(mapApiResponseToSong);
        } catch {
            return getTopCharts(limit);
        }
    };

    const toAsset = (song: JioSaavnSong): Asset & { imageUrl?: string; artists?: string } => ({
        id: `jiosaavn:${song.id}`,
        uri: song.streamingUrl,
        filename: song.title,
        mediaType: 'audio' as const,
        creationTime: Date.now(),
        modificationTime: Date.now(),
        duration: song.duration,
        width: 0,
        height: 0,
        imageUrl: song.imageUrl,
        artists: song.artists,
    });

    return {
        search,
        getSongDetails,
        getTopCharts,
        getTrending,
        toAsset,
    };
};

export const jioSaavn = createJioSaavnClient();