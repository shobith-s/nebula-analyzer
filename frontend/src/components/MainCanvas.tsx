// In frontend/src/components/MainCanvas.tsx
import { useState } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { motion } from 'framer-motion';
import DataTable from './DataTable';
import DataChart from './DataChart';
import FeatureImportanceChart from './FeatureImportanceChart';
import ChatInput from './ChatInput';
import ChatWindow from './ChatWindow';
import FileUploadZone from './FileUploadZone';
import { type AIStatus, type Message, type ImportanceData } from '../types'; // Import from new types file

interface MainCanvasProps {
  setAiStatus: (status: AIStatus) => void;
}

function MainCanvas({ setAiStatus }: MainCanvasProps) {
  // ... rest of the component logic is unchanged
  const [tabularData, setTabularData] = useState<number[][] | null>(null);
  const [featureImportances, setFeatureImportances] = useState<ImportanceData[] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileParsed = (data: number[][], fileName: string) => {
    setMessages([]);
    setFeatureImportances(null);
    setTabularData(data);
    setMessages([{ sender: 'ai', text: `Successfully loaded ${fileName}. What would you like to know?` }]);
    setAiStatus('idle');
  };

  const handleSendMessage = async (query: string) => {
    if (!tabularData) { return; }
    
    setMessages(prevMessages => [...prevMessages, { sender: 'user', text: query }]);
    setIsLoading(true);
    setAiStatus('thinking');
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
      setAiStatus('success');
    } catch (error) {
      const errorMsg = axios.isAxiosError(error) && error.response
        ? `Error from server: ${error.response.data.detail}`
        : 'Sorry, an error occurred while talking to the brain.';
      setMessages(prevMessages => [...prevMessages, { sender: 'ai', text: errorMsg }]);
      setAiStatus('error');
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
      {!tabularData ? (
        <motion.div className="card" variants={cardVariants} initial="hidden" animate="visible">
          <FileUploadZone onFileParsed={handleFileParsed} />
        </motion.div>
      ) : (
        <>
          <motion.div className="card" variants={cardVariants} initial="hidden" animate="visible">
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
        </>
      )}
    </main>
  );
}

export default MainCanvas;