import React from "react";
import { Link } from "react-router-dom";

/**
 * Parses inline markdown: **bold**, *italic*, `code`, and [text](url)
 */
function parseInline(text) {
  if (!text) return null;

  // Regex tokens
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // Bold **text**
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }

    // Italic *text*
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return <em key={idx}>{part.slice(1, -1)}</em>;
    }

    // Inline Code `text`
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code key={idx} className="chat-inline-code">
          {part.slice(1, -1)}
        </code>
      );
    }

    // Links [label](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const label = linkMatch[1];
      const url = linkMatch[2];
      const isInternal = url.startsWith("/");
      if (isInternal) {
        return (
          <Link key={idx} to={url} className="chat-content-link">
            {label}
          </Link>
        );
      }
      return (
        <a
          key={idx}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="chat-content-link"
        >
          {label}
        </a>
      );
    }

    return part;
  });
}

/**
 * Safe block markdown renderer for chat messages.
 */
export function renderChatMarkdown(content) {
  if (!content) return null;

  const lines = content.split("\n");
  const blocks = [];
  let currentList = null;
  let listType = null; // "ul" or "ol"

  const flushList = () => {
    if (currentList) {
      if (listType === "ul") {
        blocks.push(
          <ul key={`ul-${blocks.length}`} className="chat-list-ul">
            {currentList.map((item, i) => (
              <li key={i}>{parseInline(item)}</li>
            ))}
          </ul>
        );
      } else {
        blocks.push(
          <ol key={`ol-${blocks.length}`} className="chat-list-ol">
            {currentList.map((item, i) => (
              <li key={i}>{parseInline(item)}</li>
            ))}
          </ol>
        );
      }
      currentList = null;
      listType = null;
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      flushList();
      return;
    }

    // Heading ###
    if (trimmed.startsWith("### ")) {
      flushList();
      blocks.push(
        <h4 key={`h4-${index}`} className="chat-h4">
          {parseInline(trimmed.slice(4))}
        </h4>
      );
      return;
    }

    // Heading ##
    if (trimmed.startsWith("## ")) {
      flushList();
      blocks.push(
        <h3 key={`h3-${index}`} className="chat-h3">
          {parseInline(trimmed.slice(3))}
        </h3>
      );
      return;
    }

    // Heading #
    if (trimmed.startsWith("# ")) {
      flushList();
      blocks.push(
        <h2 key={`h2-${index}`} className="chat-h2">
          {parseInline(trimmed.slice(2))}
        </h2>
      );
      return;
    }

    // Unordered list item: - or *
    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (listType !== "ul") {
        flushList();
        listType = "ul";
        currentList = [];
      }
      currentList.push(ulMatch[1]);
      return;
    }

    // Ordered list item: 1. or 2.
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (listType !== "ol") {
        flushList();
        listType = "ol";
        currentList = [];
      }
      currentList.push(olMatch[2]);
      return;
    }

    // Regular paragraph
    flushList();
    blocks.push(
      <p key={`p-${index}`} className="chat-p">
        {parseInline(trimmed)}
      </p>
    );
  });

  flushList();

  return <div className="chat-rendered-markdown">{blocks}</div>;
}
