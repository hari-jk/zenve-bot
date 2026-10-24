import React from "react";
import "../styles/AIChat.css";

export default function FloatingChatButton({ isOpen, onClick }) {
  return (
    <button
      type="button"
      className="zynvo-floating-chat-trigger"
      onClick={onClick}
      aria-label={isOpen ? "Close Zynvo AI Assistant" : "Open Zynvo AI Assistant"}
      title="Chat with Zynvo AI Pet Assistant"
    >
      <span className="zynvo-floating-icon" aria-hidden="true">
        {isOpen ? "✕" : "🤖"}
      </span>
      <span className="zynvo-floating-text">
        {isOpen ? "Close AI" : "Zynvo AI"}
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
