import React from 'react';
import { motion } from 'framer-motion';
import { type AIStatus } from '../types';
import { VscThreeBars } from 'react-icons/vsc';

interface HeaderProps {
  status: AIStatus;
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ status, onToggleSidebar }) => {
  const getStatusText = () => {
    switch (status) {
      case 'thinking': return 'Thinking...';
      case 'success':  return 'Insight Generated';
      case 'error':    return 'Error Occurred';
      default:         return 'Ready for Analysis';
    }
  };

  const pulse = {
    pulsing: { scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7], transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } },
    idle: { scale: 1, opacity: 1 }
  };

  return (
    <header className="nb-header">
      <button className="hd-toggle" aria-label="Toggle sidebar" onClick={onToggleSidebar}>
        <VscThreeBars size={18} />
      </button>

      <div className="hd-spacer" />

      <motion.div
        className={`status-pill ${status}`}
        variants={pulse}
        animate={status === 'thinking' ? 'pulsing' : 'idle'}
      >
        {getStatusText()}
      </motion.div>
    </header>
  );
};

export default Header;
