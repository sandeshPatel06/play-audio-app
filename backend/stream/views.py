import asyncio
from django.conf import settings
from django.http import JsonResponse
from django.http import StreamingHttpResponse

from .queues import get_room_queue


def health_check(request):
    return JsonResponse(
        {
            'status': 'ok',
            'debug': settings.DEBUG,
            'firebase_configured': bool(getattr(settings, 'FIREBASE_DB', None)),
        }
    )


async def stream_audio(request, room_id):
    queue = get_room_queue(room_id)
    
    async def audio_generator():
        while True:
            try:
                # Wait for a chunk from the broadcaster
                # Using a timeout prevents indefinite hanging if broadcaster stops
                chunk = await asyncio.wait_for(queue.get(), timeout=5.0)
                if chunk:
                    yield chunk
            except asyncio.TimeoutError:
                # Yielding empty bytes doesn't drop the connection in chunked transfer
                # but we could also choose to end the stream if timeout occurs
                yield b''
            except Exception:
                break

    response = StreamingHttpResponse(audio_generator(), content_type='audio/mpeg')
    # Necessary headers to disable caching and indicate a continuous stream
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    response['Connection'] = 'keep-alive'
    return response
