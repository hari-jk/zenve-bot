import uuid
from django.db import models
from django.contrib.auth.models import User


class ChatSession(models.Model):
    session_id = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        default=uuid.uuid4
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="chat_sessions"
    )
    title = models.CharField(
        max_length=150,
        default="New Conversation"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"ChatSession {self.session_id} - {self.title}"


class ChatMessage(models.Model):
    ROLE_CHOICES = (
        ("user", "User"),
        ("assistant", "Assistant"),
        ("system", "System"),
    )

    session = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name="messages"
    )
    role = models.CharField(
        max_length=15,
        choices=ROLE_CHOICES,
        default="user"
    )
    content = models.TextField()
    sources = models.JSONField(
        default=list,
        blank=True
    )
    suggested_followups = models.JSONField(
        default=list,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"[{self.role}] {self.content[:40]}..."
