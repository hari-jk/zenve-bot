from rest_framework import serializers
from chatbot.models import ChatSession, ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "role",
            "content",
            "sources",
            "suggested_followups",
            "created_at"
        ]


class ChatSessionSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatSession
        fields = [
            "session_id",
            "title",
            "created_at",
            "updated_at",
            "messages"
        ]


class ChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(
        required=True,
        max_length=2000,
        trim_whitespace=True
    )
    session_id = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=64
    )
    pet_context = serializers.DictField(
        required=False,
        allow_empty=True
    )
