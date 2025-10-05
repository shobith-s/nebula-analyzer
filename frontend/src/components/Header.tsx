import React from 'react';
import { motion } from 'framer-motion';
import { VscMenu } from 'react-icons/vsc';
import { type AIStatus } from '../types';

interface HeaderProps {
  status: AIStatus;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ status, onToggleSidebar, sidebarOpen }) => {
  const getStatusText = () => {
    switch (status) {
      case 'thinking':
        return 'Thinking...';
      case 'success':
        return 'Insight Generated';
      case 'error':
        return 'Error Occurred';
      case 'idle':
      default:
        return 'Ready for Analysis';
    }
  };

  const pulseVariants = {
    pulsing: {
      scale: [1, 1.05, 1],
      opacity: [0.7, 1, 0.7],
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
    },
    idle: { scale: 1, opacity: 1 }
  };

  return (
    <header className="header">
      {/* Sidebar toggle */}
      <button
        className="sidebar-toggle"
        onClick={onToggleSidebar}
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <VscMenu size={18} />
      </button>

      <span>NEBULA Neural Status:</span>

      {/* Status chip with pulse when thinking */}
      <motion.div
        className={`status-indicator ${status}`}
        variants={pulseVariants}
        animate={status === 'thinking' ? 'pulsing' : 'idle'}
        role="status"
        aria-live="polite"
      >
        {getStatusText()}
      </motion.div>
    </header>
  );
};

export default Header;
