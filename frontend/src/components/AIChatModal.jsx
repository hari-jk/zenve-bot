import React, { useEffect } from "react";
import AIChat from "../pages/AIChat";
import "../styles/AIChat.css";

export default function AIChatModal({ isOpen, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="ai-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Zynvo AI Assistant Drawer"
    >
      <div
        className="ai-drawer-content"
        onClick={(e) => e.stopPropagation()}
      >
        <AIChat isEmbedded={true} onClose={onClose} />
      </div>
    </div>
  );
}
