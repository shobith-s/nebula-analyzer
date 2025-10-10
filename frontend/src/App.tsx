import { useState } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainCanvas from './components/MainCanvas';
import { type AIStatus } from './types';

function App() {
  const [aiStatus, setAiStatus] = useState<AIStatus>('idle');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
      <Header status={aiStatus} onToggleSidebar={() => setSidebarCollapsed(s => !s)} />
      <div className="shell-body">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(s => !s)} />
        <main className="shell-main" role="main" aria-label="Main content area">
          <MainCanvas setAiStatus={setAiStatus} />
        </main>
      </div>
    </div>
  );
}

export default App;
