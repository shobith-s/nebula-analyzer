import { useState } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainCanvas from './components/MainCanvas';
import { type AIStatus } from './types';

function App() {
  const [aiStatus, setAiStatus] = useState<AIStatus>('idle');

  return (
    <div className="app-container">
      <Header status={aiStatus} />
      <Sidebar />
      <MainCanvas setAiStatus={setAiStatus} />
    </div>
  );
}

export default App;