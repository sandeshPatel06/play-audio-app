import asyncio
from typing import Dict

# Global dictionary to keep a queue of audio chunks for each room
room_queues: Dict[str, asyncio.Queue] = {}

def get_room_queue(room_id: str) -> asyncio.Queue:
    if room_id not in room_queues:
        # Create a queue with a reasonable max size to prevent memory leaks
        # if the streamer sends data faster than the listener reads.
        room_queues[room_id] = asyncio.Queue(maxsize=1000)
    return room_queues[room_id]
