import { useRouter, useRootNavigationState } from 'expo-router';
import { useCallback } from 'react';
import { useAudioStore } from '../store/useAudioStore';

export const useSafeRouterPush = () => {
    const router = useRouter();
    const navigationState = useRootNavigationState();

    const safePush = useCallback((href: string) => {
        if (!navigationState?.key) {
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
