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
        try {
            if (router.canGoBack()) {
                router.back();
            } else {
                // If we can't go back, check if we're not already at the fallback
                router.replace(fallback as any);
            }
        } catch (error) {
            console.error('Navigation error in safeBack:', error);
            // Emergency fallback
            router.replace('/' as any);
        }
    }, [router, fallback]);


    return safeBack;
};
