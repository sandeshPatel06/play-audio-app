import { OnlineSourcePreference } from '../types/audio';

export const getSearchSourceState = (
    query: string,
    onlineSourceEnabled: boolean,
    onlineSourcePreference: OnlineSourcePreference
) => {
    const trimmedQuery = query.trim();
    const shouldShowLocalResults = trimmedQuery.length > 0 && onlineSourcePreference !== 'jiosaavn';
    const shouldShowOnlineResults = onlineSourceEnabled && onlineSourcePreference !== 'local';
    const shouldSearchOnline = shouldShowOnlineResults && trimmedQuery.length >= 2;

    return {
        trimmedQuery,
        shouldShowLocalResults,
        shouldShowOnlineResults,
        shouldSearchOnline,
    };
};
