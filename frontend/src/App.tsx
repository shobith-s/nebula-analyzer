import { useState } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainCanvas from './components/MainCanvas';
import BackgroundFX from './components/BackgroundFX';
import { type AIStatus } from './types';

function App() {
  const [aiStatus, setAiStatus] = useState<AIStatus>('idle');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className={`app-container ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
      {/* cosmic background layer */}
      <BackgroundFX />

      {/* app layers */}
      <Header
        status={aiStatus}
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
        sidebarOpen={sidebarOpen}
      />
      <Sidebar collapsed={!sidebarOpen} />
      <MainCanvas setAiStatus={setAiStatus} />
    </div>
  );
}

export default App;
