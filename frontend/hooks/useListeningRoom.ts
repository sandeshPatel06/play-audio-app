import { useCallback, useEffect } from 'react';
import { useAudio } from './useAudio';
import { useRoomStore } from '../store/useRoomStore';

const BROADCAST_URL = process.env.EXPO_PUBLIC_WS_URL || '';
const LISTEN_URL = process.env.EXPO_PUBLIC_API_URL || '';

export function useListeningRoom() {
    const { currentSong } = useAudio();
    const roomStore = useRoomStore();
    
    const { 
        roomId, 
        isBroadcasting, 
        isListening, 
        broadcastError, 
        startBroadcast: storeStartBroadcast, 
        stopBroadcast: storeStopBroadcast, 
        joinRoom, 
        leaveRoom 
    } = roomStore;

    // Note: No more auto-stop on unmount or manual sync here.
    // The useRoomStore background task handles global synchronization.

    const startBroadcast = useCallback((id: string) => {
        storeStartBroadcast(id, BROADCAST_URL, currentSong);
    }, [currentSong, storeStartBroadcast]);

    const stopBroadcast = useCallback(() => {
        storeStopBroadcast();
    }, [storeStopBroadcast]);

    // Note: No more auto-stop on unmount to support background/navigation persistence.
    // The user must explicitly stop it in the UI.

    return {
        roomId,
        isBroadcasting,
        isListening,
        broadcastError,
        startBroadcast,
        stopBroadcast,
        joinRoom,
        leaveRoom,
        LISTEN_URL,
        BROADCAST_URL,
    };
}
