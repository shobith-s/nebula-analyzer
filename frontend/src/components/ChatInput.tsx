import React, { useState } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, disabled }) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    const m = message.trim();
    if (m) {
      onSendMessage(m);
      setMessage('');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input-container">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question about your file (e.g., “correlation heatmap”, “mean of price”, “top 5 by salary” )"
        rows={3}
        disabled={disabled || isLoading}
      />
      <button
        className="send-btn"
        onClick={handleSend}
        disabled={disabled || isLoading}
        aria-label="Send"
        title="Send (Enter to send, Shift+Enter for newline)"
      >
        {isLoading ? 'Thinking…' : 'Send'}
      </button>
    </div>
  );
};

export default ChatInput;
