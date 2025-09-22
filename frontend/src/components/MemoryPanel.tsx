import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { VscHistory } from 'react-icons/vsc';

interface MemoryItem {
  query: string;
  insight: string;
}

const MemoryPanel: React.FC = () => {
  const [history, setHistory] = useState<MemoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchMemory = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('http://127.0.0.1:8000/memory');
      setHistory(response.data.history.reverse());
    } catch (error) {
      console.error("Failed to fetch AI memory:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMemory();
    // Set up an interval to refresh the memory periodically
    const interval = setInterval(fetchMemory, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval); // Clean up on component unmount
  }, []);

  return (
    <div className="memory-panel">
      <div className="memory-header">
        <VscHistory size={20} />
        <span>AI Memory</span>
        <button onClick={fetchMemory} disabled={isLoading}>Refresh</button>
      </div>
      <div className="memory-content">
        {isLoading ? (
          <p>Loading memory...</p>
        ) : history.length === 0 ? (
          <p>No memories yet. Ask a question to begin.</p>
        ) : (
          history.map((item, index) => (
            <div key={index} className="memory-item">
              <p className="memory-query"><strong>You asked:</strong> {item.query}</p>
              <p className="memory-insight"><strong>NEBULA said:</strong> {item.insight}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MemoryPanel;