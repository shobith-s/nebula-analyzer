import React from 'react';
import { motion } from 'framer-motion';
import { type AIStatus } from '../types';

interface HeaderProps {
  status: AIStatus;
}

const Header: React.FC<HeaderProps> = ({ status }) => {
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
      transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
    },
    idle: { scale: 1, opacity: 1, }
  };

  return (
    <header className="header">
      <span>NEBULA Neural Status:</span>
      <motion.div
        className={`status-indicator ${status}`}
        variants={pulseVariants}
        animate={status === 'thinking' ? 'pulsing' : 'idle'}
      >
        {getStatusText()}
      </motion.div>
    </header>
  );
};

export default Header;