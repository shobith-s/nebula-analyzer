import React from 'react';
import { VscRepo, VscBeaker, VscCollapseAll, VscThreeBars } from 'react-icons/vsc';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onToggle }) => {
  return (
    <aside className={`nb-sidebar ${collapsed ? 'collapsed' : ''}`}>

      <div className="sb-top">
        <button
          className="sb-toggle"
          aria-label="Toggle sidebar"
          onClick={onToggle}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <VscThreeBars size={18} /> : <VscCollapseAll size={18} />}
        </button>

        {/* Small brand chip (replaces the long “NebulaAnalyzer”) */}
        <div className="brand-chip" aria-label="NEBULA">
          <span className="dot" />
          <span className="word">NEBULA</span>
        </div>
      </div>

      <nav className="sb-links">
        <a className="sb-link" href="#" title="Neural Control Panel">
          <VscBeaker size={18} />
          <span className="label">Neural Control Panel</span>
        </a>
        <a className="sb-link" href="#" title="Data Sources">
          <VscRepo size={18} />
          <span className="label">Data Sources</span>
        </a>
      </nav>

      {/* Optional footer zone for version or help */}
      <div className="sb-foot">
        <span className="hint">{collapsed ? 'v0.1' : 'Nebula v0.1'}</span>
      </div>
    </aside>
  );
};

export default Sidebar;
