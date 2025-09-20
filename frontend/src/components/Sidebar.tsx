// In frontend/src/components/Sidebar.tsx
import React from 'react';
import { VscRepo, VscHistory, VscBeaker } from 'react-icons/vsc'; // Example icons

const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <a href="#" className="sidebar-link">
        <VscBeaker size={20} />
        <span>Neural Control Panel</span>
      </a>
      <a href="#" className="sidebar-link">
        <VscRepo size={20} />
        <span>Data Sources</span>
      </a>
      <a href="#" className="sidebar-link">
        <VscHistory size={20} />
        <span>AI Memory</span>
      </a>
    </aside>
  );
};

export default Sidebar;