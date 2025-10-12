import React from "react";
import classNames from "classnames";

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  return (
    <aside className={classNames("sidebar", { collapsed })} aria-label="Sidebar">
      <button
        className="sidebar-toggle"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        onClick={onToggle}
      >
        <span className="icon-bars" />
      </button>

      <nav className="nav">
        <div className="nav-section">
          <a className="nav-item" href="#neural">
            <span className="icon-lab" />
            <span className="nav-label">Neural Control Panel</span>
          </a>
          <a className="nav-item" href="#sources">
            <span className="icon-folder" />
            <span className="nav-label">Data Sources</span>
          </a>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
