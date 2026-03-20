import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useAudioStore } from '../store/useAudioStore';

export const useSafeRouterPush = () => {
    const router = useRouter();

    const safePush = useCallback((href: string) => {
        if (href === '/player') {
            const currentSong = useAudioStore.getState().currentSong;
            const isVideo = currentSong && /\.(mp4|m4v|mov|webm|m3u8)(\?.*)?$/i.test(currentSong.uri || currentSong.filename);
            if (isVideo) {
                router.push('/video_player');
                return;
            }
        }
        router.push(href as any);
    }, [router]);

    return safePush;
};
