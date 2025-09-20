import { useState } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { motion } from 'framer-motion';
import DataTable from './DataTable';
import DataChart from './DataChart';
import FeatureImportanceChart from './FeatureImportanceChart';
import ChatInput from './ChatInput';
import ChatWindow, { type Message } from './ChatWindow'; // This line is now fixed

interface ImportanceData { name: string; importance: number; }

function MainCanvas() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tabularData, setTabularData] = useState<number[][] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [featureImportances, setFeatureImportances] = useState<ImportanceData[] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMessages([]);
      setFeatureImportances(null);
      setFileName(file.name);
      Papa.parse(file, {
        complete: (result) => {
          const numericData = (result.data as Record<string, string>[]).map(row => Object.values(row).map(Number)).filter(row => row.every(val => !isNaN(val)));
          if (numericData.length === 0) { alert("Error: No valid numerical data rows found."); setTabularData(null); setFileName(''); return; }
          setTabularData(numericData);
          setMessages([{ sender: 'ai', text: `Successfully loaded ${file.name}. What would you like to know?` }]);
        },
        header: true, skipEmptyLines: true,
      });
    }
  };

  const handleSendMessage = async (query: string) => {
    if (!tabularData) {
      alert('Please upload a CSV file first.');
      return;
    }
    
    setMessages(prevMessages => [...prevMessages, { sender: 'user', text: query }]);
    setIsLoading(true);
    setFeatureImportances(null);

    const requestData = {
      tabular_data: tabularData,
      query: query,
    };

    try {
      const apiUrl = 'http://127.0.0.1:8000/analyze';
      const response = await axios.post(apiUrl, requestData);
      
      setMessages(prevMessages => [...prevMessages, { sender: 'ai', text: response.data.insight }]);
      setFeatureImportances(response.data.feature_importances);

    } catch (error) {
      const errorMsg = axios.isAxiosError(error) && error.response
        ? `Error from server: ${error.response.data.detail}`
        : 'Sorry, an error occurred while talking to the brain.';
      setMessages(prevMessages => [...prevMessages, { sender: 'ai', text: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <main className="main-canvas">
      <motion.div className="card" variants={cardVariants} initial="hidden" animate="visible">
        <label htmlFor="file-upload" className="custom-file-upload">
          {fileName || 'Upload your CSV File'}
        </label>
        <input id="file-upload" type="file" accept=".csv" onChange={handleFileChange} />
        
        <div className="chat-container">
            <ChatWindow messages={messages} />
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} disabled={!tabularData} />
        </div>
      </motion.div>

      {featureImportances && (
        <motion.div className="card" variants={cardVariants} initial="hidden" animate="visible">
            <FeatureImportanceChart data={featureImportances} />
        </motion.div>
      )}

      {tabularData && tabularData.length > 0 && (
        <motion.div className="card" variants={cardVariants} initial="hidden" animate="visible">
            <DataChart data={tabularData} />
            <DataTable data={tabularData} />
        </motion.div>
      )}
    </main>
  );
}

export default MainCanvas;