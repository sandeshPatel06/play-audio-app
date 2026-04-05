import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-media-library';
import { useAudioStore } from './useAudioStore';

const CHUNK_SIZE = 8 * 1024; // 8KB micro-chunks for instant flow

interface RoomState {
    roomId: string | null;
    isBroadcasting: boolean;
    isListening: boolean;
    broadcastError: string | null;
    ws: WebSocket | null;
    broadcastInterval: ReturnType<typeof setInterval> | null;
    position: number;
    currentSong: Asset | null;

    // Actions
    setRoomId: (id: string | null) => void;
    setIsBroadcasting: (val: boolean) => void;
    setIsListening: (val: boolean) => void;
    setBroadcastError: (err: string | null) => void;
    
    startBroadcast: (id: string, url: string, song: Asset | null) => void;
    stopBroadcast: () => void;
    joinRoom: (id: string) => void;
    leaveRoom: () => void;
    updateCurrentSong: (song: Asset | null) => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
    roomId: null,
    isBroadcasting: false,
    isListening: false,
    broadcastError: null,
    ws: null,
    broadcastInterval: null,
    position: 0,
    currentSong: null,

    setRoomId: (roomId) => set({ roomId }),
    setIsBroadcasting: (isBroadcasting) => set({ isBroadcasting }),
    setIsListening: (isListening) => set({ isListening }),
    setBroadcastError: (broadcastError) => set({ broadcastError }),

    updateCurrentSong: (song) => {
        const state = get();
        if (state.currentSong?.id !== song?.id) {
            console.log('[RoomStore] Song change detected:', song?.filename);
            set({ currentSong: song, position: 0 });
        }
    },

    startBroadcast: (id, url, song) => {
        const state = get();
        if (state.ws) state.stopBroadcast();

        set({ 
            roomId: id, 
            isBroadcasting: true, 
            broadcastError: null, 
            position: 0,
            currentSong: song 
        });

        const connect = () => {
            const { roomId, isBroadcasting } = get();
            if (!roomId || !isBroadcasting) return;

            const cleanBase = url.endsWith('/') ? url.slice(0, -1) : url;
            const wsUrl = `${cleanBase}/${roomId}/`;
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('[RoomStore] Broadcaster Open:', roomId);
                set({ broadcastError: null });
                
                const interval = setInterval(async () => {
                    const currentState = get();
                    const audioStore = useAudioStore.getState();
                    const song = audioStore.currentSong;

                    if (!currentState.isBroadcasting) return;

                    if (!currentState.ws || currentState.ws.readyState !== WebSocket.OPEN) {
                        return; // Wait for socket
                    }

                    if (!song) {
                        return; // Idle
                    }

                    // Sync current song
                    if (get().currentSong?.id !== song.id) {
                        console.log('[RoomStore] Syncing Song:', song.filename);
                        set({ currentSong: song, position: 0 });
                        return;
                    }

                    let uri = song.uri;
                    try {
                        if (uri.startsWith('http')) {
                            // Sanitize ID to be safe for filenames (remove : / \ etc)
                            const safeId = song.id.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                            const filename = `broadcast_${safeId}.mp3`;
                            const localPath = `${FileSystem.cacheDirectory}${filename}`;
                            const fileInfo = await FileSystem.getInfoAsync(localPath);
                            
                            if (!fileInfo.exists) {
                                console.log('[RoomStore] Downloading:', uri);
                                const download = await FileSystem.downloadAsync(uri, localPath);
                                uri = download.uri;
                            } else {
                                uri = localPath;
                            }
                        }

                        if (!uri.startsWith('file://') && !uri.startsWith('content://')) return;
                        
                        const fileInfo = await FileSystem.getInfoAsync(uri);
                        if (!fileInfo.exists) return;

                        const totalSize = fileInfo.size || 0;
                        const duration = audioStore.duration || 0;
                        const hostPosSeconds = audioStore.position || 0;

                        const currentPosition = get().position;
                        
                        // SYNC & THROTTLE LOGIC
                        if (duration > 0 && totalSize > 0) {
                            const expectedBytePos = Math.floor((hostPosSeconds / duration) * totalSize);
                            
                            // 1. Resync if we drift too far (8 seconds difference)
                            const driftLimit = Math.floor((8.0 / duration) * totalSize);
                            if (Math.abs(expectedBytePos - currentPosition) > driftLimit) {
                                console.log(`[RoomStore] Drift Reset: ${currentPosition} -> ${expectedBytePos}`);
                                set({ position: expectedBytePos });
                                return;
                            }

                            // 2. Rate Limit: Stay exactly 5 seconds ahead for buffering
                            const bufferLimit = Math.floor((5.0 / duration) * totalSize);
                            if (currentPosition > expectedBytePos + bufferLimit) {
                                // We're fast enough, skip this tick
                                return;
                            }
                        }

                        if (currentPosition >= totalSize) return;

                        const chunkLength = Math.min(CHUNK_SIZE, totalSize - currentPosition);
                        const chunk = await FileSystem.readAsStringAsync(uri, {
                            encoding: 'base64',
                            position: currentPosition,
                            length: chunkLength
                        });

                        currentState.ws.send(chunk);
                        
                        // Log every 100 chunks for less noise
                        if (Math.floor(currentPosition / CHUNK_SIZE) % 100 === 0) {
                             console.log(`[RoomStore] => Chunk @ ${currentPosition} / ${totalSize}`);
                        }
                        
                        set(state => ({ ...state, position: state.position + chunkLength }));
                    } catch (e) {
                        console.error('[RoomStore] Loop Err:', e);
                    }
                }, 100);

                set({ broadcastInterval: interval });
            };

            ws.onerror = (e: any) => {
                console.error('[RoomStore] WS Err:', JSON.stringify(e));
                set({ broadcastError: 'Connection error' });
            };

            ws.onclose = (event) => {
                console.warn(`[RoomStore] WS Closed: ${event.code}`);
                const currentState = get();
                if (currentState.broadcastInterval) clearInterval(currentState.broadcastInterval);
                set({ broadcastInterval: null, ws: null });

                if (get().isBroadcasting && event.code !== 1000) {
                    setTimeout(() => {
                        if (get().isBroadcasting) connect();
                    }, 3000);
                }
            };

            set({ ws: ws });
        };

        connect();
    },

    stopBroadcast: () => {
        const state = get();
        if (state.broadcastInterval) clearInterval(state.broadcastInterval);
        if (state.ws) {
            state.ws.onclose = null;
            state.ws.close();
        }
        set({ 
            isBroadcasting: false, 
            ws: null, 
            broadcastInterval: null, 
            roomId: null,
            position: 0 
        });
    },

    joinRoom: (id) => set({ roomId: id, isListening: true }),
    leaveRoom: () => set({ roomId: null, isListening: false }),
}));
