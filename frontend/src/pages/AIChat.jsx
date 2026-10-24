import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import { renderChatMarkdown } from "../utils/markdownRenderer";
import "../styles/AIChat.css";

const QUICK_PROMPTS = [
  { icon: "🐶", text: "What is the best food for adult dogs?" },
  { icon: "📦", text: "How do I track and cancel my order?" },
  { icon: "🩺", text: "How does the veterinary home visit work?" },
  { icon: "📄", text: "How can I upload a doctor prescription?" },
  { icon: "👑", text: "What are the Zenve VIP Membership perks?" },
  { icon: "💊", text: "Do you have puppy growth supplements?" },
];

export default function AIChat({ isEmbedded = false, onClose = null }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(() => {
    return localStorage.getItem("zenve_ai_chat_session") || null;
  });

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = (behavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    scrollToBottom("auto");
  }, [messages, isLoading]);

  // Load chat history on mount if session exists
  useEffect(() => {
    if (activeSessionId) {
      api
        .get(`chat/history/?session_id=${activeSessionId}`)
        .then((res) => {
          if (res.data && Array.isArray(res.data.messages) && res.data.messages.length > 0) {
            setMessages(res.data.messages);
          }
        })
        .catch((err) => {
          console.warn("Could not fetch chat history:", err);
        });
    }
  }, [activeSessionId]);

  // Auto-resize textarea
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // Submit message
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMessageObj = {
      id: `local-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessageObj]);
    setInputMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsLoading(true);

    try {
      const payload = {
        message: text,
        session_id: activeSessionId || undefined,
      };

      const res = await api.post("chat/", payload);
      const data = res.data;

      if (data.session_id && data.session_id !== activeSessionId) {
        setActiveSessionId(data.session_id);
        localStorage.setItem("zenve_ai_chat_session", data.session_id);
      }

      const assistantMessageObj = {
        id: `local-assistant-${Date.now()}`,
        role: "assistant",
        content: data.response,
        sources: data.sources || [],
        suggested_followups: data.suggested_followups || [],
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessageObj]);
    } catch (err) {
      console.error("AI chat error:", err);
      const errorMsg = {
        id: `local-err-${Date.now()}`,
        role: "assistant",
        content:
          "⚠️ I'm having trouble connecting to the Zenve service right now. Please check your connection or reach out via our [Customer Support](/help).",
        sources: [],
        suggested_followups: ["What can you help me with?", "How do I track my order?"],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  // Handle Enter key (Shift+Enter for newline)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Clear conversation
  const handleClearChat = async () => {
    if (messages.length === 0) return;
    if (window.confirm("Start a new conversation? This will clear current messages.")) {
      if (activeSessionId) {
        try {
          await api.post("chat/clear/", { session_id: activeSessionId });
        } catch (e) {
          console.warn("Failed to clear remote session:", e);
        }
      }
      setMessages([]);
      localStorage.removeItem("zenve_ai_chat_session");
      setActiveSessionId(null);
    }
  };

  // Copy to clipboard
  const handleCopyMessage = (id, content) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={isEmbedded ? "ai-embedded-chat" : "ai-chat-page-container"}>
      <div className="ai-chat-shell">
        {/* Header */}
        <header className="ai-chat-header">
          <div className="ai-chat-header-info">
            <div className="ai-chat-avatar" aria-hidden="true">
              🐾
            </div>
            <div className="ai-chat-title-group">
              <h2>
                Zynvo AI Assistant
                <span className="ai-chat-badge-verified">Verified Care</span>
              </h2>
              <div className="ai-chat-subtitle">
                <span className="ai-status-dot" aria-hidden="true"></span>
                <span>Active • Connected to Zenve Store & Health Knowledge</span>
              </div>
            </div>
          </div>

          <div className="ai-chat-header-actions">
            <button
              type="button"
              className="ai-header-btn"
              onClick={handleClearChat}
              title="Start a new conversation"
            >
              🔄 New Chat
            </button>
            {onClose && (
              <button
                type="button"
                className="ai-header-btn"
                onClick={onClose}
                aria-label="Close Chat"
              >
                ✕
              </button>
            )}
          </div>
        </header>

        {/* Message Stream */}
        <main className="ai-chat-body" role="log" aria-live="polite">
          {messages.length === 0 && (
            <div className="ai-chat-welcome">
              <div className="ai-welcome-icon">✨ 🐶 🐱</div>
              <h3>Welcome to Zynvo AI Pet Assistant!</h3>
              <p>
                Ask me anything about pet nutrition, medical products, prescription uploads,
                order tracking, or veterinary home visits. Grounded directly in verified Zenve data.
              </p>
              <div className="ai-quick-prompts-grid">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="ai-quick-prompt-card"
                    onClick={() => handleSendMessage(prompt.text)}
                  >
                    <span className="ai-quick-icon">{prompt.icon}</span>
                    <span>{prompt.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, index) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id || index}
                className={`ai-message-row ${isUser ? "user" : "assistant"}`}
              >
                {!isUser && (
                  <div className="ai-chat-avatar" style={{ width: 34, height: 34, fontSize: 18 }}>
                    🤖
                  </div>
                )}
                <div className="ai-message-bubble">
                  {renderChatMarkdown(msg.content)}

                  {/* Sources / Verified Links */}
                  {!isUser && msg.sources && msg.sources.length > 0 && (
                    <div className="ai-sources-box">
                      <span className="ai-sources-label">Verified Sources:</span>
                      {msg.sources.map((src, sIdx) => {
                        const isInternal = src.url && src.url.startsWith("/");
                        if (isInternal) {
                          return (
                            <Link key={sIdx} to={src.url} className="ai-source-pill">
                              {src.type === "product" ? "🛒" : "📄"} {src.title}
                            </Link>
                          );
                        }
                        return (
                          <a
                            key={sIdx}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ai-source-pill"
                          >
                            {src.type === "product" ? "🛒" : "📄"} {src.title}
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {/* Follow-up Prompts */}
                  {!isUser && msg.suggested_followups && msg.suggested_followups.length > 0 && (
                    <div className="ai-followups-container">
                      {msg.suggested_followups.map((fText, fIdx) => (
                        <button
                          key={fIdx}
                          type="button"
                          className="ai-followup-pill"
                          onClick={() => handleSendMessage(fText)}
                        >
                          💬 {fText}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Action / Copy footer */}
                  {!isUser && (
                    <div className="ai-message-footer">
                      <span>Zenve Verified</span>
                      <button
                        type="button"
                        className="ai-copy-btn"
                        onClick={() => handleCopyMessage(msg.id || index, msg.content)}
                      >
                        {copiedId === (msg.id || index) ? "✓ Copied" : "📋 Copy"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="ai-message-row assistant">
              <div className="ai-chat-avatar" style={{ width: 34, height: 34, fontSize: 18 }}>
                🤖
              </div>
              <div className="ai-typing-indicator" aria-label="Zynvo is thinking">
                <span className="ai-typing-dot"></span>
                <span className="ai-typing-dot"></span>
                <span className="ai-typing-dot"></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {/* Input Bar */}
        <footer className="ai-chat-input-area">
          <form
            className="ai-chat-input-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your pet, products, orders, or care..."
              className="ai-chat-textarea"
              disabled={isLoading}
              aria-label="Your message to Zynvo AI"
            />
            <button
              type="submit"
              className="ai-send-btn"
              disabled={isLoading || !inputMessage.trim()}
              title="Send message"
              aria-label="Send message"
            >
              ➤
            </button>
          </form>
          <div className="ai-chat-input-hint">
            Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for a new line.
            Grounded in Zenve verified veterinary & store knowledge.
          </div>
        </footer>
      </div>
    </div>
  );
}
