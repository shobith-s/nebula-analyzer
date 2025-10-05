import React from 'react';
import { VscRepo, VscBeaker } from 'react-icons/vsc';

interface SidebarProps {
  collapsed?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-links">
        <a href="#" className="sidebar-link" title="Neural Control Panel">
          <VscBeaker size={20} />
          <span>Neural Control Panel</span>
        </a>
        <a href="#" className="sidebar-link" title="Data Sources">
          <VscRepo size={20} />
          <span>Data Sources</span>
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
