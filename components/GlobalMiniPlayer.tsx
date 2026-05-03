import { usePathname } from 'expo-router';
import MiniPlayer from './MiniPlayer';

const HIDDEN_ROUTES = new Set(['/player', '/video_player']);

export default function GlobalMiniPlayer() {
    const pathname = usePathname();

    if (HIDDEN_ROUTES.has(pathname)) {
        return null;
    }

    return <MiniPlayer />;
}
