import * as FileSystem from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useAudio } from './useAudio';
import { Asset } from 'expo-media-library';

const CHUNK_SIZE = 128 * 1024; // 128KB chunks
const BROADCAST_URL = process.env.EXPO_PUBLIC_WS_URL;
const LISTEN_URL = process.env.EXPO_PUBLIC_API_URL;

export function useListeningRoom() {
    const { currentSong } = useAudio();
    const [roomId, setRoomId] = useState<string | null>(null);
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [broadcastError, setBroadcastError] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const positionRef = useRef(0);
    const broadcastIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const assetRef = useRef<Asset | null>(null);
    const isBroadcastingRef = useRef(false);
    const currentSongIdRef = useRef<string | null>(null);

    // Keep refs in sync for interval
    useEffect(() => {
        const previousSongId = currentSongIdRef.current;
        const newSongId = currentSong?.id ?? null;
        
        // Reset position when song changes during broadcast
        if (isBroadcastingRef.current && previousSongId !== newSongId && newSongId) {
            positionRef.current = 0;
        }
        
        assetRef.current = currentSong;
        currentSongIdRef.current = newSongId;
    }, [currentSong]);

    // Keep isBroadcastingRef in sync with isBroadcasting state
    useEffect(() => {
        isBroadcastingRef.current = isBroadcasting;
    }, [isBroadcasting]);

    const broadcastChunk = useCallback(async () => {
        if (Platform.OS === 'web') return;
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        if (!assetRef.current || !assetRef.current.uri.startsWith('file://')) return;

        try {
            const fileInfo = await FileSystem.getInfoAsync(assetRef.current.uri);
            if (!fileInfo.exists) return;

            const totalSize = fileInfo.size || 0;
            if (positionRef.current >= totalSize) {
                positionRef.current = 0; // Loop back to start
                return;
            }

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
        if (!BROADCAST_URL) {
            setBroadcastError('WebSocket server URL not configured');
            return;
        }

        setRoomId(id);
        setBroadcastError(null);
        setIsBroadcasting(true);
        positionRef.current = 0;

        const connect = () => {
            if (!id || wsRef.current?.readyState === WebSocket.OPEN) return;

            const ws = new WebSocket(`${BROADCAST_URL}${id}/`);
            
            ws.onopen = () => {
                console.log('Broadcaster connected to Room:', id);
                setBroadcastError(null);
                if (broadcastIntervalRef.current) clearInterval(broadcastIntervalRef.current);
                broadcastIntervalRef.current = setInterval(broadcastChunk, 1000);
            };

            ws.onerror = (e) => {
                console.error('WS Error:', e);
                setBroadcastError('Failed to connect to server');
            };
            
            ws.onclose = (event) => {
                console.log('Broadcaster disconnected', event.code, event.reason);
                if (broadcastIntervalRef.current) clearInterval(broadcastIntervalRef.current);
                
                // Only attempt reconnect if we're still meant to be broadcasting
                // and it wasn't a clean close (code 1000 = normal closure)
                if (isBroadcastingRef.current && event.code !== 1000) {
                    setTimeout(() => {
                        if (id && wsRef.current?.readyState !== WebSocket.OPEN) {
                            connect();
                        }
                    }, 3000);
                }
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
        broadcastError,
        startBroadcast,
        stopBroadcast,
        joinRoom,
        leaveRoom,
        LISTEN_URL,
        BROADCAST_URL,
    };
}
