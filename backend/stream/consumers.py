import base64
import logging
import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from .queues import get_room
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCIceCandidate

logger = logging.getLogger(__name__)

# { room_id: { 'broadcaster_pc': pc, 'broadcaster_id': str, 'listeners': { user_id: pc } } }
rooms_peers = {}


class AudioRoomConsumer(AsyncWebsocketConsumer):

    # ── Lifecycle ────────────────────────────────────────────────────────────

    async def connect(self):
        self.room_id = self.scope.get("url_route", {}).get("kwargs", {}).get("room_id", "")
        if not self.room_id:
            await self.close()
            return

        self.user_id = str(id(self))
        self.pc = None          # Only created for WebRTC peers (broadcasters)
        self.room = get_room(self.room_id)
        self.queue = None
        self.listener_task = None
        self.role = "unknown"

        # Join the room channel group so we receive fan-out messages (metadata etc.)
        await self.channel_layer.group_add(self.room_id, self.channel_name)

        await self.accept()
        logger.info(f"User {self.user_id} connected to room {self.room_id}")

    async def disconnect(self, code):
        logger.info(f"User {self.user_id} ({self.role}) disconnecting from room {self.room_id}")

        # Cancel listener broadcast task
        if self.listener_task:
            self.listener_task.cancel()

        # Release HTTP subscriber queue if we opened one
        if self.queue:
            self.room.remove_subscriber(self.queue)

        # Close WebRTC peer connection
        if self.pc:
            await self.pc.close()

        # Leave room channel group
        await self.channel_layer.group_discard(self.room_id, self.channel_name)

        # Cleanup rooms_peers
        if self.room_id in rooms_peers:
            if self.user_id in rooms_peers[self.room_id].get("listeners", {}):
                del rooms_peers[self.room_id]["listeners"][self.user_id]
            elif rooms_peers[self.room_id].get("broadcaster_id") == self.user_id:
                rooms_peers[self.room_id]["broadcaster_pc"] = None
                rooms_peers[self.room_id]["broadcaster_id"] = None

    # ── Message dispatch ─────────────────────────────────────────────────────

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return
        try:
            data = json.loads(text_data)
            msg_type = data.get("type")

            if msg_type == "offer":
                await self.handle_offer(data)
            elif msg_type == "candidate":
                await self.handle_candidate(data)
            elif msg_type == "subscribe":
                # Lightweight listener: HTTP audio + WS metadata only (no WebRTC).
                self.role = "http_listener"
                logger.info(f"HTTP listener {self.user_id} subscribed to metadata in room {self.room_id}")
                await self.send(text_data=json.dumps({"type": "subscribed", "room_id": self.room_id}))
            elif msg_type == "metadata":
                # Broadcaster fans metadata out to all room members.
                logger.info(f"Metadata fanout in room {self.room_id}: {data.get('title')}")
                await self.channel_layer.group_send(
                    self.room_id,
                    {
                        "type": "room_message",
                        "message": data,
                        "sender_id": self.user_id,
                    },
                )
        except Exception as e:
            logger.error(f"Error handling message for room {self.room_id}: {e}")

    # ── WebRTC offer / answer ────────────────────────────────────────────────

    async def handle_offer(self, data):
        is_broadcaster = data.get("role") == "broadcaster"
        self.role = "broadcaster" if is_broadcaster else "webrtc_listener"

        # Create a fresh RTCPeerConnection for this WebRTC peer
        self.pc = RTCPeerConnection()

        offer = RTCSessionDescription(sdp=data["offer"]["sdp"], type=data["offer"]["type"])
        await self.pc.setRemoteDescription(offer)

        if is_broadcaster:
            await self.setup_broadcaster()
        else:
            await self.setup_listener()

        answer = await self.pc.createAnswer()
        await self.pc.setLocalDescription(answer)

        await self.send(text_data=json.dumps({
            "type": "answer",
            "answer": {
                "sdp": self.pc.localDescription.sdp,
                "type": self.pc.localDescription.type,
            },
        }))

    async def handle_candidate(self, data):
        cand_data = data.get("candidate")
        if not cand_data or not self.pc:
            return
        cand_raw = cand_data.get("candidate", "")
        if not cand_raw:
            return

        from aiortc.sdp import candidate_from_sdp
        cand_str = cand_raw.split(":", 1)[1] if ":" in cand_raw else cand_raw
        try:
            candidate = candidate_from_sdp(cand_str)
            candidate.sdpMid = cand_data.get("sdpMid")
            candidate.sdpMLineIndex = cand_data.get("sdpMLineIndex")
            await self.pc.addIceCandidate(candidate)
        except Exception as e:
            logger.error(f"Failed to add ICE candidate for room {self.room_id}: {e}")

    # ── Broadcaster setup ────────────────────────────────────────────────────

    async def setup_broadcaster(self):
        logger.info(f"Setting up WebRTC Broadcaster for room {self.room_id}")

        @self.pc.on("datachannel")
        def on_datachannel(channel):
            logger.info(f"Broadcaster DataChannel opened: label={channel.label} room={self.room_id}")

            @channel.on("message")
            def on_message(message):
                # ── CRITICAL FIX ──────────────────────────────────────────
                # The mobile broadcaster sends base64-encoded MP3 bytes
                # (FileSystem.readAsStringAsync with encoding:'base64').
                # Decode to raw bytes before broadcasting so the HTTP
                # streaming endpoint delivers valid audio/mpeg to listeners.
                # ─────────────────────────────────────────────────────────
                try:
                    if isinstance(message, str):
                        raw = base64.b64decode(message)
                    else:
                        raw = message  # already bytes (future-proof)
                    self.room.broadcast(raw)
                except Exception as e:
                    logger.error(f"Failed to decode/broadcast audio chunk in room {self.room_id}: {e}")

        if self.room_id not in rooms_peers:
            rooms_peers[self.room_id] = {
                "broadcaster_id": self.user_id,
                "broadcaster_pc": self.pc,
                "listeners": {},
            }
        else:
            rooms_peers[self.room_id]["broadcaster_id"] = self.user_id
            rooms_peers[self.room_id]["broadcaster_pc"] = self.pc

    # ── WebRTC Listener setup (kept for DC audio path if needed) ─────────────

    async def setup_listener(self):
        logger.info(f"Setting up WebRTC Listener for room {self.room_id}")

        self.queue = self.room.add_subscriber()

        if self.room_id not in rooms_peers:
            rooms_peers[self.room_id] = {
                "broadcaster_id": None,
                "broadcaster_pc": None,
                "listeners": {self.user_id: self.pc},
            }
        else:
            rooms_peers[self.room_id]["listeners"][self.user_id] = self.pc

        @self.pc.on("datachannel")
        def on_datachannel(channel):
            logger.info(
                f"Listener DC received: label={channel.label} "
                f"readyState={channel.readyState} room={self.room_id}"
            )

            async def broadcast_loop():
                try:
                    logger.info(f"Broadcast loop started for listener {self.user_id} in room {self.room_id}")
                    while True:
                        chunk = await self.queue.get()
                        state = channel.readyState
                        if state == "open":
                            channel.send(chunk)
                        elif state == "connecting":
                            logger.debug(f"DC connecting, buffering chunk for room {self.room_id}")
                            await asyncio.sleep(0.05)
                            await self.queue.put(chunk)
                        else:
                            logger.warning(f"Listener DC state='{state}', dropping chunk for {self.user_id}")
                        self.queue.task_done()
                except asyncio.CancelledError:
                    logger.info(f"Broadcast loop cancelled for {self.user_id}")
                except Exception as e:
                    logger.error(f"Broadcast loop error for {self.user_id}: {e}")

            # Start immediately — don't wait for on("open") which may already have fired
            self.listener_task = asyncio.ensure_future(broadcast_loop())

            @channel.on("close")
            def on_close():
                logger.info(f"Listener DC closed for {self.user_id} in room {self.room_id}")
                if self.listener_task:
                    self.listener_task.cancel()

    # ── Channel layer: metadata fanout ───────────────────────────────────────

    async def room_message(self, event):
        """Receives group_send events and forwards metadata to this WS client."""
        if event.get("sender_id") != self.user_id:
            await self.send(text_data=json.dumps(event["message"]))
