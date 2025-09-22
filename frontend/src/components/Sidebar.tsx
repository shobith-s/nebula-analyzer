import React from 'react';
import { VscRepo, VscBeaker } from 'react-icons/vsc';
import MemoryPanel from './MemoryPanel';

const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-links">
        <a href="#" className="sidebar-link">
          <VscBeaker size={20} />
          <span>Neural Control Panel</span>
        </a>
        <a href="#" className="sidebar-link">
          <VscRepo size={20} />
          <span>Data Sources</span>
        </a>
      </div>
      <MemoryPanel />
    </aside>
  );
};

export default Sidebar;