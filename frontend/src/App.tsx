// In frontend/src/App.tsx
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainCanvas from './components/MainCanvas';

function App() {
  return (
    <div className="app-container">
      <Header />
      <Sidebar />
      <MainCanvas />
    </div>
  );
}

export default App;