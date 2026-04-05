import asyncio
from typing import Dict, Set
import logging

logger = logging.getLogger(__name__)


class Room:
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.subscribers: Set[asyncio.Queue] = set()

    def add_subscriber(self) -> asyncio.Queue:
        # Smaller maxsize (20 chunks @ 8KB/50ms = 1s buffer)
        # keeps the stream fresh and avoids "buffering delay" for late joiners.
        queue = asyncio.Queue(maxsize=20)
        self.subscribers.add(queue)
        logger.info(f"Added subscriber to room: {self.room_id} (Total: {len(self.subscribers)})")
        return queue

    def remove_subscriber(self, queue: asyncio.Queue):
        if queue in self.subscribers:
            self.subscribers.remove(queue)
            logger.info(f"Removed subscriber from room: {self.room_id} (Total: {len(self.subscribers)})")

    def broadcast(self, chunk: bytes):
        disconnected = set()
        for queue in self.subscribers:
            try:
                # If queue is full, drop the oldest packet for this subscriber
                if queue.full():
                    try:
                        queue.get_nowait()
                    except asyncio.QueueEmpty:
                        pass
                queue.put_nowait(chunk)
            except Exception as e:
                logger.error(f"Error broadcasting to subscriber in {self.room_id}: {e}")
                disconnected.add(queue)
        
        for q in disconnected:
            self.remove_subscriber(q)


rooms: Dict[str, Room] = {}


def get_room(room_id: str) -> Room:
    if room_id not in rooms:
        rooms[room_id] = Room(room_id)
        logger.info(f"Created new room instance for: {room_id}")
    return rooms[room_id]


def cleanup_room(room_id: str) -> None:
    if room_id in rooms:
        # Also could clear subscribers if needed
        del rooms[room_id]
        logger.info(f"Cleaned up room: {room_id}")
