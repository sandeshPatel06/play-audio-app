import json
from channels.generic.websocket import AsyncWebsocketConsumer
from .queues import get_room_queue

class AudioBroadcasterConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.queue = get_room_queue(self.room_id)
        
        # Accept the WebSocket connection
        await self.accept()

    async def disconnect(self, close_code):
        # We could clear the queue here if we wanted to
        pass

    async def receive(self, text_data=None, bytes_data=None):
        if text_data:
            import base64
            bytes_data = base64.b64decode(text_data)
        
        if bytes_data:
            # We received a chunk of raw audio as binary. Put it in the queue for the HTTP listener.
            if not self.queue.full():
                await self.queue.put(bytes_data)
            else:
                # If queue is full, discard some old data to keep it fresh
                try:
                    self.queue.get_nowait()
                    await self.queue.put(bytes_data)
                except Exception:
                    pass
