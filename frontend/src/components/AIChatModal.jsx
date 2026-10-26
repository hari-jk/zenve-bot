import React, { useState, useEffect } from "react";
import AIChat from "../pages/AIChat";
import "../styles/AIChat.css";

export default function AIChatModal({ isOpen, onClose }) {
  const [closingMessage, setClosingMessage] = useState(null);

  const handleGracefulClose = () => {
    if (closingMessage) return;
    // Activate refresh feature: clear session so chat reopens completely fresh
    const sessId = localStorage.getItem("zenve_ai_chat_session");
    if (sessId) {
      try {
        fetch("/api/chat/clear/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessId }),
        }).catch(() => {});
      } catch (e) {}
      localStorage.removeItem("zenve_ai_chat_session");
    }

    setClosingMessage("Thank you! Have a wonderful day! 🐾");
    setTimeout(() => {
      onClose();
      setClosingMessage(null);
    }, 700);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        handleGracefulClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="ai-modal-overlay"
      onClick={handleGracefulClose}
      role="dialog"
      aria-modal="true"
      aria-label="Personal Assistant Drawer"
    >
      <div
        className="ai-drawer-content"
        onClick={(e) => e.stopPropagation()}
      >
        {closingMessage && (
          <div className="ai-chat-closing-toast" role="status" aria-live="assertive">
            <span>{closingMessage}</span>
          </div>
        )}
        <AIChat isEmbedded={true} onClose={handleGracefulClose} />
      </div>
    </div>
  );
}
