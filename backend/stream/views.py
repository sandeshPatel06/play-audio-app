import asyncio
import logging
from django.conf import settings
from django.http import JsonResponse
from django.http import StreamingHttpResponse

from .queues import get_room_queue, cleanup_room_queue

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
    queue = get_room_queue(room_id)
    listener_connected = True

    async def audio_generator():
        nonlocal listener_connected
        while listener_connected:
            try:
                chunk = await asyncio.wait_for(queue.get(), timeout=5.0)
                if chunk:
                    yield chunk
            except asyncio.TimeoutError:
                yield b""
            except Exception as e:
                logger.error(f"Error in audio generator for room {room_id}: {e}")
                break

    try:
        response = StreamingHttpResponse(audio_generator(), content_type="audio/mpeg")
        response["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response["Pragma"] = "no-cache"
        response["Expires"] = "0"
        response["Connection"] = "keep-alive"
        return response
    finally:
        listener_connected = False
        logger.info(f"Listener disconnected from room: {room_id}")
