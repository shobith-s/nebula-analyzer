import React, { useEffect, useRef } from "react";
import { type Message } from "../types";

function mdToHtml(s: string) {
  if (!s) return "";
  // very small markdown: **bold**, newlines
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
}

interface ChatWindowProps {
  messages: Message[];
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages }) => {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="console-window">
      {messages.map((m, i) => (
        <div key={i} className={`console-line ${m.sender}`}>
          {m.sender === "user" ? (
            <>
              <span className="console-prompt">&gt;</span>
              <div className="console-text">{m.text}</div>
            </>
          ) : (
            <div
              className="console-text"
              dangerouslySetInnerHTML={{ __html: mdToHtml(m.text || "") }}
            />
          )}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
};

export default ChatWindow;
