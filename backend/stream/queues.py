import asyncio
from typing import Dict
import logging

logger = logging.getLogger(__name__)

room_queues: Dict[str, asyncio.Queue] = {}


def get_room_queue(room_id: str) -> asyncio.Queue:
    if room_id not in room_queues:
        room_queues[room_id] = asyncio.Queue(maxsize=1000)
        logger.info(f"Created new queue for room: {room_id}")
    return room_queues[room_id]


def cleanup_room_queue(room_id: str) -> None:
    if room_id in room_queues:
        try:
            room_queues[room_id].task_done()
        except Exception:
            pass
        del room_queues[room_id]
        logger.info(f"Cleaned up queue for room: {room_id}")
