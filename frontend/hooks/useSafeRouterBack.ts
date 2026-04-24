import { useRouter } from 'expo-router';
import { useCallback } from 'react';

/**
 * A safe wrapper around router.back() that falls back to a given route
 * (default: '/') when there is no screen to go back to, preventing the
 * "GO_BACK was not handled by any navigator" error.
 */
export const useSafeRouterBack = (fallback: string = '/') => {
    const router = useRouter();

    const safeBack = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace(fallback as any);
        }
    }, [router, fallback]);

    return safeBack;
};
