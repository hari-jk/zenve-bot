import os
import uuid
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from chatbot.models import ChatSession, ChatMessage
from chatbot.serializers import (
    ChatMessageSerializer,
    ChatSessionSerializer,
    ChatRequestSerializer
)
from chatbot.ai_service import AIService
from products.models import Product

logger = logging.getLogger(__name__)


class ChatAPIView(APIView):
    """
    POST /api/chat/
    Send a message to Zynvo AI Assistant and receive an intelligent,
    context-aware response.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ChatRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": "Invalid request payload", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        user_message = serializer.validated_data["message"]
        session_id = serializer.validated_data.get("session_id")
        pet_context = serializer.validated_data.get("pet_context") or {}

        # 1. Resolve or create ChatSession
        session = None
        if session_id:
            session = ChatSession.objects.filter(session_id=session_id).first()

        if not session:
            session_id = str(uuid.uuid4())
            user = request.user if request.user and request.user.is_authenticated else None
            title = user_message[:40] + ("..." if len(user_message) > 40 else "")
            session = ChatSession.objects.create(
                session_id=session_id,
                user=user,
                title=title
            )

        # 2. Retrieve recent message history for multi-turn context
        recent_messages = list(session.messages.order_by("-created_at")[:8])
        recent_messages.reverse()

        history_payload = [
            {"role": msg.role, "content": msg.content}
            for msg in recent_messages
        ]

        # 3. Save User message to database
        ChatMessage.objects.create(
            session=session,
            role="user",
            content=user_message
        )

        # 4. Generate AI response
        try:
            ai_result = AIService.generate_chat_response(
                user_message=user_message,
                conversation_history=history_payload,
                pet_context=pet_context
            )
        except Exception as exc:
            logger.error("Chat generation exception: %s", exc, exc_info=True)
            ai_result = {
                "response": "I encountered a temporary processing hiccup. Please ask again or reach out to our team at /help.",
                "sources": [],
                "suggested_followups": ["Show me popular dog foods", "How do returns work?"],
                "provider": "fallback_error"
            }

        # 5. Save Assistant response to database with embedded action card for session persistence
        saved_sources = list(ai_result.get("sources", []))
        if ai_result.get("action_card"):
            saved_sources.append({
                "type": "action_card",
                "card": ai_result["action_card"]
            })

        ChatMessage.objects.create(
            session=session,
            role="assistant",
            content=ai_result["response"],
            sources=saved_sources,
            suggested_followups=ai_result.get("suggested_followups", [])
        )

        return Response({
            "session_id": session.session_id,
            "response": ai_result["response"],
            "sources": ai_result.get("sources", []),
            "suggested_followups": ai_result.get("suggested_followups", []),
            "action_card": ai_result.get("action_card", None),
            "provider": ai_result.get("provider", "sidekick_coworker_engine")
        }, status=status.HTTP_200_OK)


class ChatHistoryAPIView(APIView):
    """
    GET /api/chat/history/?session_id=<uuid>
    Retrieve full conversation history for the given session.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        session_id = request.query_params.get("session_id")
        if not session_id:
            return Response(
                {"error": "session_id query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        session = ChatSession.objects.filter(session_id=session_id).first()
        if not session:
            return Response({"messages": []}, status=status.HTTP_200_OK)

        messages = session.messages.all().order_by("created_at")
        serializer = ChatMessageSerializer(messages, many=True)
        return Response({
            "session_id": session.session_id,
            "title": session.title,
            "messages": serializer.data
        }, status=status.HTTP_200_OK)


class ChatClearAPIView(APIView):
    """
    POST /api/chat/clear/
    Clears message history for a given session.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        session_id = request.data.get("session_id")
        if not session_id:
            return Response(
                {"error": "session_id is required in request body"},
                status=status.HTTP_400_BAD_REQUEST
            )

        session = ChatSession.objects.filter(session_id=session_id).first()
        if session:
            session.messages.all().delete()
            return Response({"status": "cleared", "session_id": session_id}, status=status.HTTP_200_OK)

        return Response({"status": "session_not_found"}, status=status.HTTP_404_NOT_FOUND)


class ChatStatusAPIView(APIView):
    """
    GET /api/chat/status/
    Returns diagnostics on chatbot health, active provider, and knowledge bases.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            from dotenv import load_dotenv
            load_dotenv(override=True)
        except Exception:
            pass

        has_gemini = bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))
        has_openai = bool(os.getenv("OPENAI_API_KEY"))

        active_provider = "zynvo_hybrid_engine"
        if has_gemini:
            active_provider = "google-gemini (pure LLM)"
        elif has_openai:
            active_provider = "openai (pure LLM)"

        product_count = Product.objects.filter(is_available=True).count()

        return Response({
            "status": "online",
            "bot_name": "Zynvo AI Assistant",
            "version": "2.0.0",
            "active_ai_provider": active_provider,
            "has_openai_key": has_openai,
            "has_gemini_key": has_gemini,
            "indexed_products_count": product_count,
            "features": [
                "Multi-turn conversational memory",
                "Product & price RAG retrieval",
                "Store policy & FAQ grounded guidance",
                "Prompt injection defense & input sanitization",
                "Zero-downtime hybrid local synthesis fallback"
            ]
        }, status=status.HTTP_200_OK)
