import React from 'react';
import { VscRepo, VscBeaker } from 'react-icons/vsc';

const Sidebar: React.FC = () => {
  return (
    <nav className="sidebar-nav">
      <a href="#" className="sidebar-link">
        <VscBeaker size={18} />
        <span>Neural Control Panel</span>
      </a>

      <a href="#" className="sidebar-link">
        <VscRepo size={18} />
        <span>Data Sources</span>
      </a>
    </nav>
  );
};

export default Sidebar;
