import { useRouter, useRootNavigationState } from 'expo-router';
import { useCallback } from 'react';
import { useAudioStore } from '../store/useAudioStore';

export const useSafeRouterPush = () => {
    const router = useRouter();
    const navigationState = useRootNavigationState();

    const safePush = useCallback((href: string) => {
        // If navigation isn't ready, we might want to wait or just log it
        if (!navigationState?.key) {
            console.warn(`Navigation not ready for push to: ${href}. Retrying...`);
            // Attempting direct navigation as a fallback for some edge cases
            try {
                router.navigate(href as any);
            } catch (e) {
                console.error('Direct navigation failed:', e);
            }
            return;
        }

        if (href === '/player') {
            const currentSong = useAudioStore.getState().currentTrack;
            const isVideo = currentSong && /\.(mp4|m4v|mov|webm|m3u8)(\?.*)?$/i.test(currentSong.uri || currentSong.filename);
            if (isVideo) {
                router.navigate('/video_player');
                return;
            }
        }
        router.navigate(href as any);
    }, [router, navigationState]);


    return safePush;
};
