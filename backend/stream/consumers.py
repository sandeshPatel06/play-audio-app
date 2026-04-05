import logging
import base64
from channels.generic.websocket import AsyncWebsocketConsumer
from .queues import get_room_queue, cleanup_room_queue

logger = logging.getLogger(__name__)


class AudioBroadcasterConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        logger.info(f"[WS] AudioBroadcasterConsumer.connect called - room_id from URL")
        self.room_id = (
            self.scope.get("url_route", {}).get("kwargs", {}).get("room_id", "")
        )
        logger.info(f"[WS] Extracted room_id: {self.room_id}")
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
        # Don't immediately clean up the queue on disconnect to allow for reconnections
        # or for listeners to finish the existing buffer.
        pass

    async def receive(self, text_data=None, bytes_data=None):
        if text_data:
            try:
                chunk = base64.b64decode(text_data)
                logger.info(
                    f"Received chunk of {len(chunk)} bytes for room {self.room_id}"
                )
                bytes_data = chunk
            except Exception as e:
                logger.error(f"Error decoding chunk for room {self.room_id}: {e}")

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
