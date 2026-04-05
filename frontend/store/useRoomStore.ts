import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { useAudioStore } from './useAudioStore';
import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription
} from 'react-native-webrtc';

// ── Debug tags ──────────────────────────────────────────────
const TAG_BC = '[RoomStore:BC]';   // Broadcaster
const TAG_LN = '[RoomStore:LN]';   // Listener
const TAG_WS = '[RoomStore:WS]';   // WebSocket
const TAG_PC = '[RoomStore:PC]';   // PeerConnection
const TAG_DC = '[RoomStore:DC]';   // DataChannel

const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
const CHUNK_SIZE = 64 * 1024; // 64 KB per chunk (larger chunks = fewer packets = lower latency

// ── Types ───────────────────────────────────────────────────
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

    setRoomId: (id: string | null) => void;
    setIsBroadcasting: (val: boolean) => void;
    setIsListening: (val: boolean) => void;
    setBroadcastError: (err: string | null) => void;

    startBroadcast: (id: string, wsUrl: string, song: MediaLibrary.Asset | null) => void;
    stopBroadcast: () => void;
    /**
     * joinRoom — Listener audio path (HTTP streaming via expo-audio).
     *
     * @param id      Room code
     * @param wsUrl   WebSocket base URL for metadata (e.g. ws://host/ws/stream)
     * @param httpUrl HTTP base URL for audio stream (e.g. http://host)
     */
    joinRoom: (id: string, wsUrl: string, httpUrl: string) => void;
    leaveRoom: () => void;
    updateCurrentSong: (song: MediaLibrary.Asset | null) => void;
}

// ── Helper: create a MediaLibrary.Asset stub for a URL ──────
function makeRemoteTrack(url: string, label = 'Listening Room'): MediaLibrary.Asset {
    return {
        id: `remote:${url}`,
        uri: url,
        filename: label,
        mediaType: MediaLibrary.MediaType.audio,
        creationTime: Date.now(),
        modificationTime: Date.now(),
        duration: 0,
        width: 0,
        height: 0,
    } as MediaLibrary.Asset;
}

// ── Store ───────────────────────────────────────────────────
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
                    artist: 'Syncing with Host',
                }));
            }
        }
    },

    // ── BROADCASTER ───────────────────────────────────────────
    startBroadcast: (id, wsUrl, song) => {
        const state = get();
        if (state.ws) state.stopBroadcast();

        console.log(`${TAG_BC} Starting broadcast for room: ${id}`);
        set({
            roomId: id,
            isBroadcasting: true,
            broadcastError: null,
            position: 0,
            currentSong: song,
            pc: null,
            dc: null,
        });

        const connect = () => {
            const currentRoomId = get().roomId;
            if (!currentRoomId) return;

            const cleanBase = wsUrl.endsWith('/') ? wsUrl.slice(0, -1) : wsUrl;
            const wsUrlFull = `${cleanBase}/${currentRoomId}/`;
            console.log(`${TAG_WS} [BC] Connecting → ${wsUrlFull}`);
            const ws = new WebSocket(wsUrlFull);

            ws.onopen = async () => {
                console.log(`${TAG_WS} [BC] WebSocket OPENED`);

                const pc = new RTCPeerConnection({ iceServers }) as any;
                // Broadcaster creates DC so server receives it via ondatachannel
                const dc = pc.createDataChannel('audio', { ordered: false, maxRetransmits: 0 });
                set({ pc, dc, ws });

                pc.oniceconnectionstatechange = () =>
                    console.log(`${TAG_PC} [BC] iceConnectionState → ${pc.iceConnectionState}`);
                pc.onconnectionstatechange = () =>
                    console.log(`${TAG_PC} [BC] connectionState → ${pc.connectionState}`);
                pc.onsignalingstatechange = () =>
                    console.log(`${TAG_PC} [BC] signalingState → ${pc.signalingState}`);
                pc.onicegatheringstatechange = () =>
                    console.log(`${TAG_PC} [BC] iceGatheringState → ${pc.iceGatheringState}`);

                pc.onicecandidate = (event: any) => {
                    if (event.candidate) {
                        console.log(`${TAG_PC} [BC] Sending ICE candidate`);
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
                        }
                    } else {
                        console.log(`${TAG_PC} [BC] ICE gathering complete`);
                    }
                };

                dc.onopen = () => console.log(`${TAG_DC} [BC] DataChannel OPENED`);
                dc.onclose = () => {
                    console.log(`${TAG_DC} [BC] DataChannel CLOSED`);
                    const st = get();
                    if (st.isBroadcasting) {
                        console.log(`${TAG_BC} Broadcast ended unexpectedly`);
                        get().stopBroadcast();
                    }
                };
                dc.onerror = (e: any) => console.error(`${TAG_DC} [BC] DataChannel ERROR:`, e);

                console.log(`${TAG_PC} [BC] Creating offer...`);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                console.log(`${TAG_PC} [BC] Offer sent (role=broadcaster)`);
                ws.send(JSON.stringify({ type: 'offer', offer, role: 'broadcaster' }));

                // ── Chunk sending loop (mutex-guarded) ──────────────
                let isBusy = false;
                let cachedUri: string | null = null;
                let cachedTotalSize = 0;

                const interval = setInterval(async () => {
                    if (isBusy) return;
                    isBusy = true;
                    try {
                        const st = get();
                        const audioStore = useAudioStore.getState();
                        const song = audioStore.currentSong;
                        if (!st.isBroadcasting || !song || !st.dc || st.dc.readyState !== 'open') return;

                        // Resolve & cache local URI + file size once per song
                        const songChanged = cachedUri && !cachedUri.includes(song.id.replace(/[^a-z0-9]/gi, '_'));
                        if (!cachedUri || songChanged) {
                            let uri = song.uri;
                            if (uri.startsWith('http')) {
                                const filename = `broadcast_${song.id.replace(/[^a-z0-9]/gi, '_')}.mp3`;
                                const localPath = `${FileSystem.cacheDirectory}${filename}`;
                                const fi = await FileSystem.getInfoAsync(localPath);
                                if (!fi.exists) {
                                    const dl = await FileSystem.downloadAsync(uri, localPath);
                                    uri = dl.uri;
                                } else {
                                    uri = localPath;
                                }
                            }
                            const fi = await FileSystem.getInfoAsync(uri) as any;
                            cachedUri = uri;
                            cachedTotalSize = fi.size || 0;
                            if (songChanged) set({ position: 0 });
                            console.log(`${TAG_BC} Cached URI, size=${cachedTotalSize}`);
                        }

                        let curPos = get().position;
                        const duration = audioStore.duration || 0;
                        const hostPos = audioStore.position || 0;
                        const totalSize = cachedTotalSize;

                        // Sync to host playback position only on significant drift (>10s)
                        // Also handle loop detection: if host position < 1s and we sent > 80% of file
                        if (duration > 0 && totalSize > 0) {
                            const expected = Math.floor((hostPos / duration) * totalSize);
                            const tolerance = Math.floor((10.0 / duration) * totalSize);
                            const nearEnd = curPos > totalSize * 0.8;
                            const hostAtStart = hostPos < 1;

                            if (nearEnd && hostAtStart) {
                                console.log(`${TAG_BC} Loop detected, resetting to 0`);
                                set({ position: 0 });
                                curPos = 0;
                            } else if (Math.abs(expected - curPos) > tolerance) {
                                console.log(`${TAG_BC} Sync pos ${curPos}→${expected} (drift>${tolerance})`);
                                set({ position: expected });
                                curPos = expected;
                            }
                        }

                        // Handle any edge case where position exceeds total
                        if (curPos >= totalSize) {
                            curPos = 0;
                        }

                        const chunkLen = Math.min(CHUNK_SIZE, totalSize - curPos);
                        const chunk = await FileSystem.readAsStringAsync(cachedUri!, {
                            encoding: 'base64',
                            position: curPos,
                            length: chunkLen,
                        });

                        st.dc.send(chunk);
                        set({ position: curPos + chunkLen });

                        if (Math.random() < 0.03) {
                            console.log(`${TAG_BC} Sent chunk pos=${curPos} len=${chunkLen} (${hostPos.toFixed(1)}s)`);
                        }
                    } catch (e) {
                        console.error(`${TAG_BC} Loop error:`, e);
                    } finally {
                        isBusy = false;
                    }
                }, 50);

                set({ broadcastInterval: interval });
            };

            ws.onmessage = async (e) => {
                const data = JSON.parse(e.data);
                console.log(`${TAG_WS} [BC] ← ${data.type}`);
                const pc = get().pc;
                if (!pc) return;

                if (data.type === 'answer') {
                    console.log(`${TAG_PC} [BC] Setting remote description...`);
                    await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                    console.log(`${TAG_PC} [BC] Remote desc SET (signalingState: ${pc.signalingState})`);
                } else if (data.type === 'candidate') {
                    console.log(`${TAG_PC} [BC] Adding remote ICE candidate`);
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
            };

            ws.onclose = (e) =>
                console.warn(`${TAG_WS} [BC] CLOSED code=${e.code} reason="${e.reason}"`);
            ws.onerror = (e) =>
                console.error(`${TAG_WS} [BC] ERROR:`, e);
        };

        connect();
    },

    stopBroadcast: () => {
        console.log(`${TAG_BC} Stopping broadcast`);
        const state = get();
        if (state.broadcastInterval) clearInterval(state.broadcastInterval);
        if (state.pc) state.pc.close();
        if (state.ws) state.ws.close();
        set({ isBroadcasting: false, ws: null, pc: null, dc: null, broadcastInterval: null, roomId: null, position: 0 });
    },

    // ── LISTENER ─────────────────────────────────────────────
    //
    // Audio:    HTTP streaming via expo-audio → expo-audio natively decodes MP3
    //           The HTTP endpoint serves raw MP3 bytes (server decodes base64).
    // Metadata: WebSocket only (no WebRTC on listener side)
    //
    joinRoom: (id, wsUrl, httpUrl) => {
        const state = get();
        if (state.ws) state.leaveRoom();

        console.log(`${TAG_LN} Joining room: ${id}`);
        set({ roomId: id, isListening: true, remoteSongInfo: null });

        // The backend serves raw MP3 bytes decoded from the broadcaster's base64 chunks.
        const cleanHttp = httpUrl.replace(/\/+$/, '');
        const streamUrl = `${cleanHttp}/stream/listen/${id}/`;
        console.log(`${TAG_LN} HTTP audio stream URL: ${streamUrl}`);

        // Create a remote track stub and load it into the audio store.
        // expo-audio will handle MP3 streaming natively over HTTP.
        const track = makeRemoteTrack(streamUrl, 'Listening Room');
        const audioStore = useAudioStore.getState();
        audioStore.setQueue([track]);
        audioStore.setCurrentIndex(0);
        audioStore.setNowPlayingContext({ type: 'remote', title: 'Listening Room' });

        // We can't call createAudioPlayer here (not a hook), so we signal
        // the app that a remote track is queued. The MiniPlayer / Player
        // screen will pick it up because currentSong changes.
        // Alternatively trigger via a lightweight flag listened to by useAudio.
        // For now, store the track so room.tsx can call playFromUrl directly.
        set({ currentSong: track });

        // ── 2. WebSocket for metadata only ────────────────────
        const cleanWs = wsUrl.replace(/\/+$/, '');
        const wsUrlFull = `${cleanWs}/${id}/`;
        console.log(`${TAG_WS} [LN] Connecting for metadata → ${wsUrlFull}`);
        const ws = new WebSocket(wsUrlFull);
        set({ ws });

        ws.onopen = () => {
            console.log(`${TAG_WS} [LN] WebSocket OPENED — sending subscribe`);
            ws.send(JSON.stringify({ type: 'subscribe', role: 'listener' }));
        };

        ws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                console.log(`${TAG_WS} [LN] ← ${data.type}`);
                if (data.type === 'metadata') {
                    console.log(`${TAG_LN} Metadata: title="${data.title}" artist="${data.artist}"`);
                    set({ remoteSongInfo: { title: data.title, artist: data.artist } });
                } else if (data.type === 'subscribed') {
                    console.log(`${TAG_LN} Subscribed to room ${data.room_id}`);
                }
            } catch (err) {
                console.error(`${TAG_WS} [LN] Parse error:`, err);
            }
        };

        ws.onclose = (e) =>
            console.warn(`${TAG_WS} [LN] CLOSED code=${e.code} reason="${e.reason}"`);
        ws.onerror = (e) =>
            console.error(`${TAG_WS} [LN] ERROR:`, e);
    },

    leaveRoom: () => {
        console.log(`${TAG_LN} Leaving room`);
        const state = get();
        if (state.ws) state.ws.close();
        // Audio is managed by useAudioStore; caller should call clearAudio() or stop playback
        set({ roomId: null, isListening: false, ws: null, pc: null, dc: null, remoteSongInfo: null, currentSong: null });
    },
}));
