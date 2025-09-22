// In frontend/src/components/Sidebar.tsx
import React from 'react';
import { VscRepo, VscBeaker } from 'react-icons/vsc';
import MemoryPanel from './MemoryPanel'; // Import the new component

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
      {/* Add the memory panel to the sidebar */}
      <MemoryPanel />
    </aside>
  );
};

export default Sidebar;