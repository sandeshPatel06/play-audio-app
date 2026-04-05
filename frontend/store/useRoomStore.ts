import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
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
    currentSong: MediaLibrary.Asset | null;
    remoteSongInfo: { title: string; artist: string } | null;

    // Actions
    setRoomId: (id: string | null) => void;
    setIsBroadcasting: (val: boolean) => void;
    setIsListening: (val: boolean) => void;
    setBroadcastError: (err: string | null) => void;
    
    startBroadcast: (id: string, url: string, song: MediaLibrary.Asset | null) => void;
    stopBroadcast: () => void;
    joinRoom: (id: string, url: string) => void;
    leaveRoom: () => void;
    updateCurrentSong: (song: MediaLibrary.Asset | null) => void;
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
    remoteSongInfo: null,

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
            const currentRoomId = get().roomId;
            const currentIsBroadcasting = get().isBroadcasting;
            if (!currentRoomId || !currentIsBroadcasting) return;

            const cleanBase = url.endsWith('/') ? url.slice(0, -1) : url;
            const wsUrl = `${cleanBase}/${currentRoomId}/`;
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('[RoomStore] Broadcaster Open:', currentRoomId);
                set({ broadcastError: null });
                
                // Initial metadata sync
                const audioStore = useAudioStore.getState();
                const initialSong = audioStore.currentSong;
                if (initialSong && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'metadata',
                        title: initialSong.filename,
                        artist: 'Syncing with Host'
                    }));
                }

                const interval = setInterval(async () => {
                    const currentState = get();
                    const audioStoreInternal = useAudioStore.getState();
                    const currentSongInternal = audioStoreInternal.currentSong;

                    if (!currentState.isBroadcasting) return;

                    if (ws.readyState !== WebSocket.OPEN) {
                        return; // Wait for socket
                    }

                    if (!currentSongInternal) {
                        return; // Idle
                    }

                    // Sync current song metadata if changed during broadcast
                    if (get().currentSong?.id !== currentSongInternal.id) {
                        console.log('[RoomStore] Syncing Song:', currentSongInternal.filename);
                        set({ currentSong: currentSongInternal, position: 0 });
                        
                        // Notify listeners of song change
                        ws.send(JSON.stringify({
                            type: 'metadata',
                            title: currentSongInternal.filename,
                            artist: 'Syncing with Host'
                        }));
                        return;
                    }

                    let uri = currentSongInternal.uri;
                    try {
                        if (uri.startsWith('http')) {
                            const safeId = currentSongInternal.id.replace(/[^a-z0-9]/gi, '_').toLowerCase();
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
                        
                        const fileInfoInternal = await FileSystem.getInfoAsync(uri);
                        if (!fileInfoInternal.exists) return;

                        const totalSize = fileInfoInternal.size || 0;
                        const duration = audioStoreInternal.duration || 0;
                        const hostPosSeconds = audioStoreInternal.position || 0;
                        const currentBytePosition = get().position;
                        
                        if (duration > 0 && totalSize > 0) {
                            const expectedBytePos = Math.floor((hostPosSeconds / duration) * totalSize);
                            const driftLimit = Math.floor((8.0 / duration) * totalSize);
                            
                            if (Math.abs(expectedBytePos - currentBytePosition) > driftLimit) {
                                console.log(`[RoomStore] Drift Reset: ${currentBytePosition} -> ${expectedBytePos}`);
                                set({ position: expectedBytePos });
                                return;
                            }

                            const bufferLimit = Math.floor((5.0 / duration) * totalSize);
                            if (currentBytePosition > expectedBytePos + bufferLimit) {
                                return; // Rate limit reached
                            }
                        }

                        if (currentBytePosition >= totalSize) return;

                        const chunkLength = Math.min(CHUNK_SIZE, totalSize - currentBytePosition);
                        const chunk = await FileSystem.readAsStringAsync(uri, {
                            encoding: 'base64',
                            position: currentBytePosition,
                            length: chunkLength
                        });

                        ws.send(chunk);
                        
                        if (Math.floor(currentBytePosition / CHUNK_SIZE) % 100 === 0) {
                             console.log(`[RoomStore] => Chunk @ ${currentBytePosition} / ${totalSize}`);
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

    joinRoom: (id, url) => {
        const state = get();
        if (state.ws) state.leaveRoom();

        set({ roomId: id, isListening: true, remoteSongInfo: null });

        const connect = () => {
            const { roomId, isListening } = get();
            if (!roomId || !isListening) return;

            const cleanBase = url.endsWith('/') ? url.slice(0, -1) : url;
            const wsUrl = `${cleanBase}/${roomId}/`;
            const ws = new WebSocket(wsUrl);

            ws.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    if (data.type === 'metadata') {
                        console.log('[RoomStore] Remote Metadata:', data.title);
                        set({ remoteSongInfo: { title: data.title, artist: data.artist } });
                    }
                } catch {
                    // Raw binary chunks processed by HTTP stream
                }
            };

            ws.onerror = () => set({ broadcastError: 'Listener connection error' });
            ws.onclose = () => {
                if (get().isListening) {
                    setTimeout(() => { if (get().isListening) connect(); }, 3000);
                }
            };

            set({ ws });
        };

        connect();
    },

    leaveRoom: () => {
        const state = get();
        if (state.ws) {
            state.ws.onclose = null;
            state.ws.close();
        }
        set({ roomId: null, isListening: false, ws: null, remoteSongInfo: null });
    },
}));
