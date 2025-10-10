import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

// Global resets, variables, background, etc.
import './index.css'              // ← REQUIRED so variables & base styles exist

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
