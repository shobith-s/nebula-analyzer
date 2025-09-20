import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

// FIXED: Added the 'export' keyword here
export interface Message {
  sender: 'user' | 'ai';
  text: string;
}

interface ChatWindowProps {
  messages: Message[];
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages }) => {
  const chatEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-window">
      {messages.map((msg, index) => (
        <motion.div
          key={index}
          className={`chat-message ${msg.sender}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="message-bubble">
            <pre>{msg.text}</pre>
          </div>
        </motion.div>
      ))}
      <div ref={chatEndRef} />
    </div>
  );
};

export default ChatWindow;