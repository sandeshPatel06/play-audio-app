import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from .queues import get_room_queue, cleanup_room_queue

logger = logging.getLogger(__name__)


class AudioBroadcasterConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = (
            self.scope.get("url_route", {}).get("kwargs", {}).get("room_id", "")
        )
        if not self.room_id:
            logger.warning("No room_id found in URL route")
            await self.close()
            return
        self.queue = get_room_queue(self.room_id)

        await self.accept()
        logger.info(f"Broadcaster connected to room: {self.room_id}")

    async def disconnect(self, code):
        logger.info(
            f"Broadcaster disconnected from room: {self.room_id} with code: {code}"
        )
        cleanup_room_queue(self.room_id)

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
