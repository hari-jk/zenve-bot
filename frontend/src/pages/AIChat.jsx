import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import { renderChatMarkdown } from "../utils/markdownRenderer";
import {
  resolveLocalIntent,
  getGracefulDegradationResponse,
  getTimeBasedGreeting
} from "../utils/localIntentRouter";
import "../styles/AIChat.css";

const SIDEKICK_PROMPTS = [
  { icon: "📦", text: "Check low stock products" },
  { icon: "🎟️", text: "Create a 20% discount coupon code FESTIVE20" },
  { icon: "📊", text: "Summarize store sales & revenue" },
  { icon: "🐶", text: "Recommend supplements for dog joint care" },
  { icon: "🩺", text: "How does the veterinary home visit work?" },
  { icon: "🚚", text: "What is your free shipping and return policy?" },
];

export default function AIChat({ isEmbedded = false, onClose = null }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [closingMessage, setClosingMessage] = useState(null);
  const [hasSubmittedFirst, setHasSubmittedFirst] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(() => {
    return localStorage.getItem("zenve_ai_chat_session") || null;
  });

  const isFirstQuestionSubmitted = hasSubmittedFirst || messages.some((m) => m.role === "user");

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Refresh feature: resets state, session, input, and remote conversation
  const handleRefreshChat = async (promptConfirm = false) => {
    if (promptConfirm && messages.length > 0) {
      if (!window.confirm("Refresh conversation and start fresh?")) {
        return;
      }
    }
    const sessId = activeSessionId || localStorage.getItem("zenve_ai_chat_session");
    if (sessId) {
      try {
        await api.post("chat/clear/", { session_id: sessId });
      } catch (e) {
        console.warn("Failed to clear remote session:", e);
      }
    }
    localStorage.removeItem("zenve_ai_chat_session");
    setActiveSessionId(null);
    setMessages([]);
    setInputMessage("");
    setHasSubmittedFirst(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = isEmbedded ? "42px" : "auto";
    }
  };

  // Close chat and activate the refresh feature every time
  const handleCloseChat = async () => {
    // 1. Activate refresh feature immediately on close
    await handleRefreshChat(false);

    // 2. Display polite toast and trigger close
    if (!onClose) return;
    setClosingMessage("Thank you! Have a wonderful day! 🐾");
    setTimeout(() => {
      onClose();
      setClosingMessage(null);
    }, 700);
  };

  // Auto-refresh cleanup on unmount/close
  useEffect(() => {
    return () => {
      localStorage.removeItem("zenve_ai_chat_session");
    };
  }, []);

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
            const restored = res.data.messages.map((m) => {
              const actionCardSrc = m.sources && m.sources.find((s) => s.type === "action_card");
              return {
                ...m,
                action_card: actionCardSrc ? actionCardSrc.card : null,
              };
            });
            setMessages(restored);
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
      const minHeight = isEmbedded ? 42 : 42;
      const maxHeight = isEmbedded ? 85 : 90;
      textareaRef.current.style.height = `${Math.max(minHeight, Math.min(textareaRef.current.scrollHeight, maxHeight))}px`;
    }
  };

  // Copy coupon code helper
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
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

    setHasSubmittedFirst(true);
    setMessages((prev) => [...prev, userMessageObj]);
    setInputMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = isEmbedded ? "42px" : "auto";
    }
    setIsLoading(true);

    try {
      const payload = {
        message: text,
        session_id: activeSessionId || undefined,
        pet_context: {
          sidekick_mode: "auto",
        },
      };

      const res = await api.post("chat/", payload);
      const data = res.data;

      if (data.session_id && data.session_id !== activeSessionId) {
        setActiveSessionId(data.session_id);
        localStorage.setItem("zenve_ai_chat_session", data.session_id);
      }

      const assistantMessageObj = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response,
        sources: data.sources || [],
        suggested_followups: data.suggested_followups || [],
        action_card: data.action_card || null,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessageObj]);
    } catch (err) {
      console.warn("Backend API unavailable or timed out, resolving via local intent router:", err);
      const localResolved = resolveLocalIntent(text) || getGracefulDegradationResponse();
      const assistantMessageObj = {
        id: `local-assistant-${Date.now()}`,
        role: "assistant",
        content: localResolved.response,
        sources: localResolved.sources || [],
        suggested_followups: localResolved.suggested_followups || [],
        action_card: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessageObj]);
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
      setHasSubmittedFirst(false);
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

  // RENDER SHOPIFY SIDEKICK ACTION CARDS
  const renderActionCard = (card) => {
    if (!card) return null;

    if (card.type === "coupon_created") {
      return (
        <div className="sidekick-action-card sidekick-coupon-card">
          <div className="sidekick-card-header">
            <span>🎟️ Promo Discount Code Created</span>
            <span className="sidekick-badge">Live in Store DB</span>
          </div>
          <div className="sidekick-coupon-body">
            <div className="sidekick-coupon-code-box">
              <span className="sidekick-code-text">{card.code}</span>
              <button
                type="button"
                className="sidekick-btn-copy"
                onClick={() => handleCopyCode(card.code)}
              >
                {copiedCode === card.code ? "✓ Copied!" : "Copy Code"}
              </button>
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#10b981" }}>
              {card.discount}
            </div>
          </div>
          <div className="sidekick-coupon-details">
            <span><strong>Min Order:</strong> ₹{card.min_order}</span>
            <span><strong>Expires:</strong> {card.expiry}</span>
            <span><strong>Status:</strong> {card.status}</span>
          </div>
          <Link to={card.action_url || "/admin/coupons"} className="sidekick-card-action-btn">
            Manage Coupons in Admin Portal →
          </Link>
        </div>
      );
    }

    if (card.type === "coupon_list" && Array.isArray(card.coupons)) {
      return (
        <div className="sidekick-action-card">
          <div className="sidekick-card-header">
            <span>🎟️ Active Store Coupons</span>
            <span className="sidekick-badge">{card.coupons.length} Active</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {card.coupons.map((c, idx) => (
              <div key={idx} className="sidekick-inventory-item">
                <div>
                  <strong style={{ color: "#facc15", fontFamily: "monospace", fontSize: 13 }}>{c.code}</strong>
                  <span style={{ marginLeft: 8, color: "#94a3b8", fontSize: 11 }}>({c.discount} off, Min: ₹{c.min_order})</span>
                </div>
                <button
                  type="button"
                  className="sidekick-btn-copy"
                  onClick={() => handleCopyCode(c.code)}
                >
                  {copiedCode === c.code ? "✓ Copied" : "Copy"}
                </button>
              </div>
            ))}
          </div>
          <Link to="/admin/coupons" className="sidekick-card-action-btn">
            Open Coupon Manager →
          </Link>
        </div>
      );
    }

    if (card.type === "inventory_alert") {
      return (
        <div className="sidekick-action-card">
          <div className="sidekick-card-header">
            <span>📦 Inventory Restock Alert</span>
            <span className="sidekick-badge" style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5" }}>
              {card.total_low_stock} Items Low
            </span>
          </div>
          {card.products && card.products.length > 0 ? (
            <div className="sidekick-inventory-list">
              {card.products.map((p) => (
                <div key={p.id} className="sidekick-inventory-item">
                  <div>
                    <div className="sidekick-item-name">{p.name}</div>
                    <div className="sidekick-item-sku">SKU: {p.sku} • ₹{p.price}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={`sidekick-stock-badge ${p.stock === 0 ? "stock-critical" : "stock-low"}`}>
                      {p.stock === 0 ? "Out of Stock" : `${p.stock} left`}
                    </span>
                    <Link to={p.action_url || `/products/edit/${p.id}`} className="sidekick-prod-btn">
                      Restock
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: "8px 0", fontSize: 12, color: "#10b981" }}>
              ✓ All products currently maintain healthy inventory levels!
            </p>
          )}
          <Link to={card.action_url || "/products/manage"} className="sidekick-card-action-btn">
            Open Inventory Manager →
          </Link>
        </div>
      );
    }

    if (card.type === "sales_summary") {
      return (
        <div className="sidekick-action-card">
          <div className="sidekick-card-header">
            <span>📊 Executive Store Performance Briefing</span>
            <span className="sidekick-badge">Live Store DB</span>
          </div>
          <div className="sidekick-sales-grid">
            <div className="sidekick-stat-box">
              <div className="sidekick-stat-label">Total GMV</div>
              <div className="sidekick-stat-value">₹{card.total_gmv?.toLocaleString()}</div>
            </div>
            <div className="sidekick-stat-box">
              <div className="sidekick-stat-label">Orders</div>
              <div className="sidekick-stat-value">{card.total_orders}</div>
            </div>
            <div className="sidekick-stat-box">
              <div className="sidekick-stat-label">Average Order</div>
              <div className="sidekick-stat-value">₹{card.aov?.toFixed(0)}</div>
            </div>
            <div className="sidekick-stat-box">
              <div className="sidekick-stat-label">Active SKUs</div>
              <div className="sidekick-stat-value">{card.total_products}</div>
            </div>
          </div>
          <Link to={card.action_url || "/admin/analytics"} className="sidekick-card-action-btn">
            View Full BI Analytics Suite →
          </Link>
        </div>
      );
    }

    if (card.type === "prescription_queue") {
      return (
        <div className="sidekick-action-card">
          <div className="sidekick-card-header">
            <span>🩺 Prescription Verification Queue</span>
            <span className="sidekick-badge">{card.pending_count} Pending</span>
          </div>
          <p style={{ margin: "6px 0", fontSize: 12, color: "#94a3b8" }}>
            {card.pending_count > 0
              ? `There are ${card.pending_count} customer veterinary prescriptions awaiting clinical review.`
              : "All customer prescriptions have been verified and cleared."}
          </p>
          <Link to={card.action_url || "/prescriptions"} className="sidekick-card-action-btn">
            Open Prescription Verification Desk →
          </Link>
        </div>
      );
    }

    if (card.type === "product_recommendations" && Array.isArray(card.products)) {
      return (
        <div className="sidekick-action-card">
          <div className="sidekick-card-header">
            <span>🛍️ Recommended Catalog Products</span>
            <span className="sidekick-badge">Verified Catalog</span>
          </div>
          <div className="sidekick-product-grid">
            {card.products.map((p) => (
              <div key={p.id} className="sidekick-product-card">
                <img
                  src={p.image || "/placeholder-product.png"}
                  alt={p.name}
                  className="sidekick-prod-thumb"
                  onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=200"; }}
                />
                <div className="sidekick-prod-title">{p.name}</div>
                <div className="sidekick-prod-price">₹{p.price}</div>
                <Link to={p.action_url || `/products/${p.id}`} className="sidekick-prod-btn">
                  View Product
                </Link>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={isEmbedded ? "ai-embedded-chat" : "ai-chat-page-container"}>
      <div className="ai-chat-shell">
        {closingMessage && (
          <div className="ai-chat-closing-toast" role="status" aria-live="assertive">
            <span>{closingMessage}</span>
          </div>
        )}

        {/* Header */}
        <header className="ai-chat-header">
          <div className="ai-chat-header-info">
            <div className="ai-chat-avatar" aria-hidden="true">
              ⚡
            </div>
            <div className="ai-chat-title-group">
              <h2>Sidekick AI Co-worker</h2>
              <div className="ai-chat-subtitle">
                <span className="ai-status-dot" aria-hidden="true"></span>
                <span>Autonomous Store Partner • Online</span>
              </div>
            </div>
          </div>

          <div className="ai-chat-header-actions">
            <button
              type="button"
              className="ai-header-btn ai-refresh-btn"
              onClick={() => handleRefreshChat(true)}
              title="Refresh conversation"
              aria-label="Refresh conversation"
            >
              🔄 {!isEmbedded && "New Chat"}
            </button>
            {onClose && (
              <button
                type="button"
                className="ai-header-btn ai-close-btn"
                onClick={handleCloseChat}
                aria-label="Close Chat"
                title="Close and refresh chat"
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
              <div className="ai-welcome-icon" style={{ fontSize: isEmbedded ? "22px" : "32px", marginBottom: "4px" }}>
                ⚡ 📦 🎟️ 📊
              </div>
              <h3 style={{ fontSize: isEmbedded ? "14px" : "18px", margin: "0 0 4px 0", color: "#fff" }}>
                {getTimeBasedGreeting()}! I'm your Sidekick AI Co-worker.
              </h3>
              <p style={{ fontSize: isEmbedded ? "12px" : "13px", margin: "0 0 10px 0", color: "#94a3b8", lineHeight: "1.4" }}>
                I'm your intelligent store partner. Ask me to audit inventory, generate discount coupons, summarize sales, or answer pet care and product questions.
              </p>
              <div className="ai-quick-prompts-grid">
                {SIDEKICK_PROMPTS.slice(0, isEmbedded ? 4 : 6).map((prompt, idx) => (
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
            const actionCard = msg.action_card || (msg.sources && msg.sources.find((s) => s.type === "action_card")?.card);

            return (
              <div
                key={msg.id || index}
                className={`ai-message-row ${isUser ? "user" : "assistant"}`}
              >
                {!isUser && (
                  <div
                    className="ai-chat-avatar"
                    style={{
                      width: isEmbedded ? 22 : 34,
                      height: isEmbedded ? 22 : 34,
                      fontSize: isEmbedded ? 12 : 18,
                    }}
                  >
                    ⚡
                  </div>
                )}
                <div className="ai-message-bubble">
                  {renderChatMarkdown(msg.content)}

                  {/* Render Sidekick Action Card if available */}
                  {!isUser && renderActionCard(actionCard)}

                  {/* Sources / Verified Links */}
                  {!isUser && msg.sources && msg.sources.filter((s) => s.type !== "action_card").length > 0 && (
                    <div className="ai-sources-box">
                      <span className="ai-sources-label">Sources & Citations:</span>
                      {msg.sources
                        .filter((s) => s.type !== "action_card")
                        .map((src, sIdx) => {
                          const isInternal = src.url && src.url.startsWith("/");
                          const icon = src.type === "product" ? "🛒" : (src.type === "web" ? "🌐" : (src.type === "admin" ? "⚙️" : "📄"));
                          if (isInternal) {
                            return (
                              <Link key={sIdx} to={src.url} className={`ai-source-pill ${src.type || ""}`}>
                                {icon} {src.title}
                              </Link>
                            );
                          }
                          return (
                            <a
                              key={sIdx}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`ai-source-pill ${src.type || ""}`}
                              title={`External link: ${src.title}`}
                            >
                              {icon} {src.title} ↗
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
                      <span>⚡ Sidekick Intelligence</span>
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
                ⚡
              </div>
              <div className="ai-typing-indicator" aria-label="Sidekick is analyzing">
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
              placeholder={
                isFirstQuestionSubmitted
                  ? ""
                  : "Ask Sidekick (e.g. 'Low stock products', 'Create 20% coupon', 'Dog food')..."
              }
              className="ai-chat-textarea"
              disabled={isLoading}
              aria-label="Your message to Sidekick AI"
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
          {!isFirstQuestionSubmitted && (
            <div className="ai-chat-input-hint">
              Press <strong>Enter</strong> to send. Powered by{" "}
              <strong>Sidekick AI Co-worker</strong> • Integrated with live store database &amp; catalog.
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
