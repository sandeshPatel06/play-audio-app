from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/stream/<str:room_id>/', consumers.AudioRoomConsumer.as_asgi()),
]
