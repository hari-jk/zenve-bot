from django.urls import path
from chatbot.views import (
    ChatAPIView,
    ChatHistoryAPIView,
    ChatClearAPIView,
    ChatStatusAPIView
)

urlpatterns = [
    path("", ChatAPIView.as_view(), name="chat-message"),
    path("history/", ChatHistoryAPIView.as_view(), name="chat-history"),
    path("clear/", ChatClearAPIView.as_view(), name="chat-clear"),
    path("status/", ChatStatusAPIView.as_view(), name="chat-status"),
]
