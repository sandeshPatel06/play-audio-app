from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/stream/(?P<room_id>\w+)/$', consumers.AudioBroadcasterConsumer.as_asgi()),
]
