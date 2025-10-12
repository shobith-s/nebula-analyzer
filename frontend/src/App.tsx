import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import MainCanvas from "./components/MainCanvas";
import "./App.css";

const App: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />

      <div className="app-content">
        <MainCanvas />
      </div>
    </div>
  );
};

export default App;
