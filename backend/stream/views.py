import asyncio
import logging
from django.conf import settings
from django.http import JsonResponse
from django.http import StreamingHttpResponse

from .queues import get_room

logger = logging.getLogger(__name__)


def health_check(request):
    return JsonResponse(
        {
            "status": "ok",
            "debug": settings.DEBUG,
            "firebase_configured": bool(getattr(settings, "FIREBASE_DB", None)),
        }
    )

async def stream_audio(request, room_id):
    logger.info(
        f"[LISTEN] stream_audio called with room_id={room_id}, method={request.method}"
    )
    room = get_room(room_id)
    queue = room.add_subscriber()

    async def audio_generator():
        logger.info(f"Listener joined room: {room_id}")
        try:
            while True:
                try:
                    # Low latency: Wait for short bursts.
                    # 5s is plenty for 50ms chunks.
                    chunk = await asyncio.wait_for(queue.get(), timeout=5.0)
                    yield chunk
                except asyncio.TimeoutError:
                    # Keep-alive byte to prevent Daphne/Nginx/Browser timeouts
                    yield b"\0"
        except Exception as e:
            logger.error(f"Error in audio generator for room {room_id}: {e}")
        finally:
            room.remove_subscriber(queue)
            logger.info(f"Listener disconnected from room: {room_id}")

    response = StreamingHttpResponse(audio_generator(), content_type="audio/mpeg")
    response["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response["Pragma"] = "no-cache"
    response["Expires"] = "0"
    response["Connection"] = "keep-alive"
    return response
