import React from 'react';
import { motion } from 'framer-motion';

export type AIStatus = 'idle' | 'thinking' | 'success' | 'error';

interface HeaderProps {
  status: AIStatus;
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ status, onToggleSidebar }) => {
  const statusText =
    status === 'thinking'
      ? 'Thinking...'
      : status === 'success'
      ? 'Insight Generated'
      : status === 'error'
      ? 'Error Occurred'
      : 'Ready for Analysis';

  const pulseVariants = {
    pulsing: {
      scale: [1, 1.05, 1],
      opacity: [0.7, 1, 0.7],
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
    },
    idle: { scale: 1, opacity: 1 },
  };

  return (
    <header className="header">
      <button
        className="icon-button"
        aria-label="Toggle sidebar"
        onClick={onToggleSidebar}
      >
        <span className="hamburger" />
      </button>

      <div className="brand">
        <span className="brand-name">NEBULA</span>
        <span className="brand-suffix">Analyzer</span>
        <span className="brand-version">v0.1</span>
      </div>

      <motion.div
        className={`status-indicator ${status}`}
        variants={pulseVariants}
        animate={status === 'thinking' ? 'pulsing' : 'idle'}
      >
        {statusText}
      </motion.div>
    </header>
  );
};

export default Header;
