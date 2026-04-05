import logging
import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from .queues import get_room_queue
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCIceCandidate

logger = logging.getLogger(__name__)

# Track active room connections (Broadcaster + Listeners)
# { room_id: { 'broadcaster_pc': pc, 'listeners': { user_id: pc } } }
rooms_peers = {}

class AudioRoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope.get("url_route", {}).get("kwargs", {}).get("room_id", "")
        if not self.room_id:
            await self.close()
            return

        self.user_id = str(id(self)) # Unique ID for this connection instance
        self.pc = RTCPeerConnection()
        self.queue = get_room_queue(self.room_id)
        self.listener_task = None
        
        await self.accept()
        logger.info(f"User {self.user_id} signaling connected to room {self.room_id}")

    async def disconnect(self, code):
        logger.info(f"User {self.user_id} disconnected from room {self.room_id}")
        if self.listener_task:
            self.listener_task.cancel()
        if self.pc:
            await self.pc.close()
        
        # Cleanup from rooms list
        if self.room_id in rooms_peers:
            if self.user_id in rooms_peers[self.room_id].get('listeners', {}):
                del rooms_peers[self.room_id]['listeners'][self.user_id]
            elif rooms_peers[self.room_id].get('broadcaster_id') == self.user_id:
                rooms_peers[self.room_id]['broadcaster_pc'] = None
                rooms_peers[self.room_id]['broadcaster_id'] = None

    async def receive(self, text_data=None, bytes_data=None):
        if text_data:
            try:
                data = json.parse(text_data)
                msg_type = data.get('type')
                
                if msg_type == 'offer':
                    await self.handle_offer(data)
                elif msg_type == 'candidate':
                    await self.handle_candidate(data)
                elif msg_type == 'metadata':
                    # Fan out metadata to others in room via signaling
                    await self.channel_layer.group_send(
                        self.room_id,
                        {
                            "type": "room_message",
                            "message": data,
                            "sender_id": self.user_id
                        }
                    )
            except Exception as e:
                logger.error(f"Error handling message for room {self.room_id}: {e}")

    async def handle_offer(self, data):
        offer = RTCSessionDescription(sdp=data['offer']['sdp'], type=data['offer']['type'])
        await self.pc.setRemoteDescription(offer)
        
        # Determine if this peer is a Broadcaster or Listener
        # We'll use a simple flag or detect from existing state
        is_broadcaster = data.get('role') == 'broadcaster'
        
        if is_broadcaster:
            await self.setup_broadcaster()
        else:
            await self.setup_listener()
            
        answer = await self.pc.createAnswer()
        await self.pc.setLocalDescription(answer)
        
        await self.send(text_data=json.dumps({
            'type': 'answer',
            'answer': {'sdp': self.pc.localDescription.sdp, 'type': self.pc.localDescription.type}
        }))

    async def handle_candidate(self, data):
        if data.get('candidate'):
            candidate = RTCIceCandidate(
                sdpMid=data['candidate']['sdpMid'],
                sdpMLineIndex=data['candidate']['sdpMLineIndex'],
                candidate=data['candidate']['candidate']
            )
            await self.pc.addIceCandidate(candidate)

    async def setup_broadcaster(self):
        logger.info(f"Setting up WebRTC Broadcaster for room {self.room_id}")
        
        @self.pc.on("datachannel")
        def on_datachannel(channel):
            logger.info(f"Broadcaster DataChannel opened: {channel.label}")
            
            @channel.on("message")
            async def on_message(message):
                # We received raw audio chunk from Broadcaster. Put it in SFU queue.
                if not self.queue.full():
                    await self.queue.put(message)
                else:
                    try:
                        self.queue.get_nowait()
                        await self.queue.put(message)
                    except: pass

        # Register as broadcaster
        if self.room_id not in rooms_peers:
            rooms_peers[self.room_id] = {'broadcaster_id': self.user_id, 'broadcaster_pc': self.pc, 'listeners': {}}
        else:
            rooms_peers[self.room_id]['broadcaster_id'] = self.user_id
            rooms_peers[self.room_id]['broadcaster_pc'] = self.pc

    async def setup_listener(self):
        logger.info(f"Setting up WebRTC Listener for room {self.room_id}")
        
        # Create DataChannel for output
        dc = self.pc.createDataChannel("audio")
        
        # Register listener
        if self.room_id not in rooms_peers:
            rooms_peers[self.room_id] = {'broadcaster_id': None, 'broadcaster_pc': None, 'listeners': {self.user_id: self.pc}}
        else:
            rooms_peers[self.room_id]['listeners'][self.user_id] = self.pc

        async def broadcast_loop():
            try:
                logger.info(f"Starting broadcast loop for listener {self.user_id}")
                while True:
                    # Get chunk from queue
                    chunk = await self.queue.get()
                    if dc.readyState == "open":
                        dc.send(chunk)
                    self.queue.task_done()
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.error(f"Listener loop error: {e}")

        # Start the loop when DC is open
        @dc.on("open")
        def on_open():
            self.listener_task = asyncio.create_task(broadcast_loop())

    # Helper for signaling fan-out
    async def room_message(self, event):
        if event['sender_id'] != self.user_id:
            await self.send(text_data=json.dumps(event['message']))
