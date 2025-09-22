import { useState, useMemo } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import DataTable from './DataTable';
import DataChart from './DataChart';
import FeatureImportanceChart from './FeatureImportanceChart';
import ChatInput from './ChatInput';
import ChatWindow, { type Message } from './ChatWindow';
import FileUploadZone from './FileUploadZone';
import { type AIStatus, type ImportanceData } from '../types';

interface MainCanvasProps {
  setAiStatus: (status: AIStatus) => void;
}

function MainCanvas({ setAiStatus }: MainCanvasProps) {
  const [tabularData, setTabularData] = useState<string[][] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [featureImportances, setFeatureImportances] = useState<ImportanceData[] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [xAxis, setXAxis] = useState<string>('');
  const [yAxis, setYAxis] = useState<string>('');
  const [modelChoice, setModelChoice] = useState<'gemini' | 'local'>('gemini');

  const handleFileParsed = (data: string[][], headers: string[], fileName: string) => {
    // ... (This function is unchanged)
    setMessages([{ sender: 'ai', text: `Successfully loaded ${fileName}. Columns detected: ${headers.join(', ')}. What would you like to know?` }]);
    setFeatureImportances(null);
    setTabularData(data);
    setHeaders(headers);
    if (headers.length >= 2) {
      setXAxis(headers[0]);
      setYAxis(headers[1]);
    } else if (headers.length > 0) {
      setXAxis(headers[0]);
      setYAxis(headers[0]);
    }
    setAiStatus('idle');
  };

  const handleSendMessage = async (query: string) => {
    if (!tabularData || !headers) { return; }
    
    setMessages(prevMessages => [...prevMessages, { sender: 'user', text: query }]);
    setIsLoading(true);
    setAiStatus('thinking');
    setFeatureImportances(null);
    setAnomalies([]);

    const requestData = {
      tabular_data: [headers, ...tabularData],
      query: query,
      model_choice: modelChoice, // This will be sent to the backend
    };

    try {
      const apiUrl = 'http://127.0.0.1:8000/analyze';
      const response = await axios.post(apiUrl, requestData);
      setMessages(prevMessages => [...prevMessages, { sender: 'ai', text: response.data.insight }]);
      setFeatureImportances(response.data.feature_importances);
      setAnomalies(response.data.anomalies);
      setAiStatus('success');
    } catch (error) {
      const errorMsg = axios.isAxiosError(error) && error.response ? `Error from server: ${error.response.data.detail}` : 'Sorry, an error occurred while talking to the brain.';
      setMessages(prevMessages => [...prevMessages, { sender: 'ai', text: errorMsg }]);
      setAiStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const numericDataForViz = useMemo(() => {
    // ... (This function is unchanged)
    if (!tabularData) return [];
    return tabularData.map(row => row.map(Number)).filter(row => row.every(val => !isNaN(val)));
  }, [tabularData]);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const [anomalies, setAnomalies] = useState<number[]>([]);

  return (
    <main className="main-canvas">
      {!tabularData ? (
        <motion.div className="card" variants={cardVariants} initial="hidden" animate="visible">
          <FileUploadZone onFileParsed={handleFileParsed} />
        </motion.div>
      ) : (
        <>
          <motion.div className="card" variants={cardVariants} initial="hidden" animate="visible">
            <div className="model-selector">
              <span>Select AI Engine:</span>
              <label>
                <input type="radio" value="gemini" checked={modelChoice === 'gemini'} onChange={() => setModelChoice('gemini')} />
                Gemini API (Cloud)
              </label>
              <label>
                <input type="radio" value="local" checked={modelChoice === 'local'} onChange={() => setModelChoice('local')} />
                GPT-Neo (Local)
              </label>
            </div>
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
          
          <motion.div className="card" variants={cardVariants} initial="hidden" animate="visible">
              <div className="chart-controls">
                <div className="select-wrapper">
                  <label>X-Axis:</label>
                  <select value={xAxis} onChange={(e) => setXAxis(e.target.value)}>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="select-wrapper">
                  <label>Y-Axis:</label>
                  <select value={yAxis} onChange={(e) => setYAxis(e.target.value)}>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
              <DataChart data={numericDataForViz} headers={headers} xAxisKey={xAxis} yAxisKey={yAxis} />
              <DataTable data={numericDataForViz} headers={headers} anomalies={anomalies} />
          </motion.div>
        </>
      )}
    </main>
  );
}

export default MainCanvas;