import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { useAudioStore } from './useAudioStore';
import { 
    RTCPeerConnection, 
    RTCIceCandidate, 
    RTCSessionDescription 
} from 'react-native-webrtc';
import { 
    ExpoPlayAudioStream, 
    EncodingTypes, 
    PlaybackModes 
} from "@saltmango/expo-audio-stream";

const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
const CHUNK_SIZE = 16 * 1024; 

interface RoomState {
    roomId: string | null;
    isBroadcasting: boolean;
    isListening: boolean;
    broadcastError: string | null;
    ws: WebSocket | null;
    pc: any; 
    dc: any;
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
    pc: null,
    dc: null,
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
            set({ currentSong: song, position: 0 });
            if (state.ws && state.ws.readyState === WebSocket.OPEN) {
                state.ws.send(JSON.stringify({
                    type: 'metadata',
                    title: song?.filename || 'Stopped',
                    artist: 'Syncing with Host'
                }));
            }
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
            currentSong: song,
            pc: null,
            dc: null
        });

        const connect = () => {
            const currentRoomId = get().roomId;
            if (!currentRoomId) return;

            const cleanBase = url.endsWith('/') ? url.slice(0, -1) : url;
            const wsUrl = `${cleanBase}/${currentRoomId}/`;
            const ws = new WebSocket(wsUrl);

            ws.onopen = async () => {
                console.log('[RoomStore] Broadcaster Signal Open:', currentRoomId);
                
                const pc = new RTCPeerConnection({ iceServers }) as any;
                const dc = pc.createDataChannel('audio', { ordered: false, maxRetransmits: 0 });
                set({ pc, dc, ws });

                pc.onicecandidate = (event: any) => {
                    if (event.candidate && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
                    }
                };

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                ws.send(JSON.stringify({ type: 'offer', offer, role: 'broadcaster' }));

                const interval = setInterval(async () => {
                    const st = get();
                    const audioStore = useAudioStore.getState();
                    const song = audioStore.currentSong;

                    if (!st.isBroadcasting || !song || !st.dc || st.dc.readyState !== 'open') return;

                    let uri = song.uri;
                    try {
                        if (uri.startsWith('http')) {
                            const filename = `broadcast_${song.id.replace(/[^a-z0-9]/gi,'_')}.mp3`;
                            const localPath = `${FileSystem.cacheDirectory}${filename}`;
                            const fileInfo = await FileSystem.getInfoAsync(localPath);
                            if (!fileInfo.exists) {
                                const download = await FileSystem.downloadAsync(uri, localPath);
                                uri = download.uri;
                            } else {
                                uri = localPath;
                            }
                        }

                        const curPos = get().position;
                        const fileInfo = await FileSystem.getInfoAsync(uri) as any;
                        const totalSize = fileInfo.size || 0;
                        const duration = audioStore.duration || 0;
                        const hostPos = audioStore.position || 0;

                        if (duration > 0 && totalSize > 0) {
                            const expected = Math.floor((hostPos / duration) * totalSize);
                            if (Math.abs(expected - curPos) > Math.floor((3.0 / duration) * totalSize)) {
                                set({ position: expected });
                                return;
                            }
                        }

                        if (curPos >= totalSize) return;

                        const chunkLen = Math.min(CHUNK_SIZE, totalSize - curPos);
                        const chunk = await FileSystem.readAsStringAsync(uri, {
                            encoding: 'base64',
                            position: curPos,
                            length: chunkLen
                        });

                        st.dc.send(chunk);
                        set(s => ({ ...s, position: s.position + chunkLen }));
                    } catch (e) {
                         console.error('[RoomStore] Loop Err:', e);
                    }
                }, 100);

                set({ broadcastInterval: interval });
            };

            ws.onmessage = async (e) => {
                const data = JSON.parse(e.data);
                const pc = get().pc;
                if (!pc) return;
                
                if (data.type === 'answer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                } else if (data.type === 'candidate') {
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
            };
        };

        connect();
    },

    stopBroadcast: () => {
        const state = get();
        if (state.broadcastInterval) clearInterval(state.broadcastInterval);
        if (state.pc) state.pc.close();
        if (state.ws) state.ws.close();
        set({ isBroadcasting: false, ws: null, pc: null, dc: null, broadcastInterval: null, roomId: null, position: 0 });
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

            ws.onopen = async () => {
                const pc = new RTCPeerConnection({ iceServers }) as any;
                set({ pc, ws });

                pc.onicecandidate = (event: any) => {
                    if (event.candidate && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
                    }
                };

                pc.ondatachannel = (event: any) => {
                    const dc = event.channel;
                    set({ dc });
                    dc.onopen = async () => {
                        try {
                            await ExpoPlayAudioStream.setSoundConfig({ 
                                sampleRate: 44100, playbackMode: PlaybackModes.CONVERSATION 
                            });
                            await ExpoPlayAudioStream.startBufferedAudioStream({
                                turnId: "room-stream",
                                encoding: EncodingTypes.PCM_S16LE,
                                bufferConfig: { targetBufferMs: 300, minBufferMs: 150, maxBufferMs: 600 }
                            });
                        } catch (e) {
                             console.warn('[RoomStore] Player Init Err:', e);
                        }
                    };

                    dc.onmessage = (msg: any) => {
                        ExpoPlayAudioStream.playAudioBuffered(msg.data, "room-stream");
                    };
                };

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                ws.send(JSON.stringify({ type: 'offer', offer, role: 'listener' }));
            };

            ws.onmessage = async (e) => {
                try {
                    const data = JSON.parse(e.data);
                    const pc = get().pc;
                    if (!pc) return;
                    
                    if (data.type === 'metadata') {
                         set({ remoteSongInfo: { title: data.title, artist: data.artist } });
                    } else if (data.type === 'answer') {
                        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                    } else if (data.type === 'candidate') {
                        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                    }
                } catch { }
            };
        };

        connect();
    },

    leaveRoom: () => {
        const state = get();
        if (state.pc) state.pc.close();
        if (state.ws) state.ws.close();
        try { ExpoPlayAudioStream.stopBufferedAudioStream("room-stream"); } catch {}
        set({ roomId: null, isListening: false, ws: null, pc: null, dc: null, remoteSongInfo: null });
    },
}));
