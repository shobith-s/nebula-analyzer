import React, { useState } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainCanvas from './components/MainCanvas';

export type AIStatus = 'idle' | 'thinking' | 'success' | 'error';

const App: React.FC = () => {
  const [aiStatus, setAiStatus] = useState<AIStatus>('idle');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  return (
    <div className="app-container">
      <Header
        status={aiStatus}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <Sidebar />
      </aside>

      <main className="main-canvas">
        {/* The canvas itself should not render any header/topbar anymore */}
        <MainCanvas setAiStatus={setAiStatus} />
      </main>
    </div>
  );
};

export default App;
