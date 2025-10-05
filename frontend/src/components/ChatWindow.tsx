import React, { useEffect, useRef } from 'react';
import { type Message } from '../types';

interface ChatWindowProps {
  messages: Message[];
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages }) => {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="console-window">
      {messages.map((m, i) => (
        <div key={i} className={`console-line ${m.sender}`}>
          {m.sender === 'user' ? (
            <>
              <span className="console-prompt">&gt;</span>
              <pre className="console-text">{m.text}</pre>
            </>
          ) : (
            <pre className="console-text">{m.text}</pre>
          )}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
};

export default ChatWindow;
