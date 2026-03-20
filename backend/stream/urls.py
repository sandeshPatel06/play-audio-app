from django.urls import path
from . import views

urlpatterns = [
    path('listen/<str:room_id>/', views.stream_audio, name='listen_audio'),
]
