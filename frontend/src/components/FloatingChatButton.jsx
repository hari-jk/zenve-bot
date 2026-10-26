import React from "react";
import "../styles/AIChat.css";

export default function FloatingChatButton({ isOpen, onClick }) {
  return (
    <button
      type="button"
      className="zynvo-floating-chat-trigger"
      onClick={onClick}
      aria-label={isOpen ? "Close Help Assistant" : "Open Help Assistant"}
      title="Help Assistant"
    >
      <span className="zynvo-floating-icon" aria-hidden="true">
        {isOpen ? "✕" : "🤖"}
      </span>
      <span className="zynvo-floating-text">
        {isOpen ? "Close" : "Help"}
      </span>
      {!isOpen && (
        <span
          className="zynvo-floating-online-dot"
          aria-hidden="true"
          title="AI Assistant Online"
        ></span>
      )}
    </button>
  );
}
