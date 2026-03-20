import * as FileSystem from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useAudio } from './useAudio';
import { Asset } from 'expo-media-library';

const CHUNK_SIZE = 128 * 1024; // 128KB chunks
const BROADCAST_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://192.168.1.100:8000/ws/stream/';
const LISTEN_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:8000/listen/';

export function useListeningRoom() {
    const { currentSong } = useAudio();
    const [roomId, setRoomId] = useState<string | null>(null);
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [isListening, setIsListening] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const positionRef = useRef(0);
    const broadcastIntervalRef = useRef<any>(null);
    const assetRef = useRef<Asset | null>(null);

    // Keep refs in sync for interval
    useEffect(() => {
        assetRef.current = currentSong;
    }, [currentSong]);

    const broadcastChunk = useCallback(async () => {
        if (Platform.OS === 'web') return;
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        if (!assetRef.current || !assetRef.current.uri.startsWith('file://')) return;

        try {
            const fileInfo = await FileSystem.getInfoAsync(assetRef.current.uri);
            if (!fileInfo.exists) return;

            const totalSize = fileInfo.size || 0;
            if (positionRef.current >= totalSize) return;

            // Read a chunk of bytes as base64
            const chunk = await FileSystem.readAsStringAsync(assetRef.current.uri, {
                encoding: 'base64',
                position: positionRef.current,
                length: Math.min(CHUNK_SIZE, totalSize - positionRef.current)
            });

            wsRef.current.send(chunk);
            positionRef.current += CHUNK_SIZE;

        } catch (error) {
            console.error('Error broadcasting chunk:', error);
        }
    }, []);

    const startBroadcast = useCallback((id: string) => {
        setRoomId(id);
        setIsBroadcasting(true);
        positionRef.current = 0;

        const connect = () => {
            if (!id || wsRef.current?.readyState === WebSocket.OPEN) return;

            const ws = new WebSocket(`${BROADCAST_URL}${id}/`);
            
            ws.onopen = () => {
                console.log('Broadcaster connected to Room:', id);
                if (broadcastIntervalRef.current) clearInterval(broadcastIntervalRef.current);
                broadcastIntervalRef.current = setInterval(broadcastChunk, 1000);
            };

            ws.onerror = (e) => console.error('WS Error:', e);
            
            ws.onclose = () => {
                console.log('Broadcaster disconnected, attempting reconnect...');
                if (broadcastIntervalRef.current) clearInterval(broadcastIntervalRef.current);
                
                // Attempt to reconnect after 3 seconds if still meant to be broadcasting
                setTimeout(() => {
                    if (id && wsRef.current?.readyState !== WebSocket.OPEN) {
                        connect();
                    }
                }, 3000);
            };

            wsRef.current = ws;
        };

        connect();
    }, [broadcastChunk]);

    const stopBroadcast = useCallback(() => {
        setIsBroadcasting(false);
        if (broadcastIntervalRef.current) clearInterval(broadcastIntervalRef.current);
        if (wsRef.current) {
            wsRef.current.close();
        }
    }, []);

    const joinRoom = useCallback((id: string) => {
        setRoomId(id);
        setIsListening(true);
        // Instruct the audio player to play the remote MP3 stream from our Django backend
        // We pass it to the audio player manually, though standard `useAudio` needs an Asset.
        // The integration of `playFromUrl` handles this.
    }, []);

    const leaveRoom = useCallback(() => {
        setRoomId(null);
        setIsListening(false);
    }, []);

    useEffect(() => {
        return () => stopBroadcast();
    }, [stopBroadcast]);

    return {
        roomId,
        isBroadcasting,
        isListening,
        startBroadcast,
        stopBroadcast,
        joinRoom,
        leaveRoom,
        LISTEN_URL,
    };
}
