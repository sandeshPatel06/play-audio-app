from django.urls import path
from . import views

urlpatterns = [
    path("health/", views.health_check, name="health_check"),
    path("stream/listen/<str:room_id>/", views.stream_audio, name="listen_audio"),
]
