import { useRootNavigationState, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

export const useSafeRouterPush = () => {
    const router = useRouter();
    const rootNavigationState = useRootNavigationState();
    const [pendingHref, setPendingHref] = useState<string | null>(null);

    useEffect(() => {
        if (!pendingHref || !rootNavigationState?.key) return;
        const timer = setTimeout(() => {
            try {
                router.push(pendingHref as any);
            } catch {
                // Ignore transient router mount races.
            } finally {
                setPendingHref(null);
            }
        }, 0);
        return () => clearTimeout(timer);
    }, [pendingHref, rootNavigationState?.key, router]);

    const safePush = useCallback((href: string) => {
        if (rootNavigationState?.key) {
            router.push(href as any);
            return;
        }
        setPendingHref(href);
    }, [rootNavigationState?.key, router]);

    return safePush;
};
