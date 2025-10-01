import { useState, useMemo } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import DataTable from './DataTable';
import DataChart from './DataChart';
import FeatureImportanceChart from './FeatureImportanceChart';
import ChatInput from './ChatInput';
import ChatWindow, { type Message } from './ChatWindow';
import FileUploadZone from './FileUploadZone';
import DataHealthReport, { type CleaningChoices } from './DataHealthReport';
import { type AIStatus, type ImportanceData } from '../types';

interface MainCanvasProps {
  setAiStatus: (status: AIStatus) => void;
}

// Define the types for the health report
interface ColumnProfile {
  column_name: string; data_type: string; missing_values: number;
  missing_percentage: number; outlier_count: number;
}
interface HealthReport {
  general_stats: { total_rows: number; duplicate_rows: number; };
  column_profiles: ColumnProfile[];
}

function MainCanvas({ setAiStatus }: MainCanvasProps) {
  const [view, setView] = useState<'upload' | 'profile' | 'analysis'>('upload');
  const [rawData, setRawData] = useState<string[][] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [cleaningChoices, setCleaningChoices] = useState<CleaningChoices | null>(null);

  const [featureImportances, setFeatureImportances] = useState<ImportanceData[] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [xAxis, setXAxis] = useState<string>('');
  const [yAxis, setYAxis] = useState<string>('');
  const [modelChoice, setModelChoice] = useState<'gemini' | 'local'>('gemini');
  const [anomalies, setAnomalies] = useState<number[]>([]);

  const handleFileParsed = async (data: string[][], headers: string[], fileName: string) => {
    setRawData(data);
    setHeaders(headers);
    setFileName(fileName);
    setView('profile');

    try {
      const response = await axios.post('http://127.0.0.1:8000/profile-data', {
        tabular_data: [headers, ...data]
      });
      setHealthReport(response.data);
    } catch (error) {
      console.error("Failed to profile data:", error);
      alert("Could not generate a data health report.");
      setView('upload');
    }
  };

  const proceedToAnalysis = (choices: CleaningChoices) => {
    setCleaningChoices(choices);
    setView('analysis');
    setMessages([{ sender: 'ai', text: `Successfully loaded and profiled ${fileName}. Cleaning plan approved. What would you like to know?` }]);
  };

  const handleSendMessage = async (query: string) => {
    if (!rawData || !headers) { return; }
    
    setMessages(prevMessages => [...prevMessages, { sender: 'user', text: query }]);
    setIsLoading(true);
    setAiStatus('thinking');
    setFeatureImportances(null);
    setAnomalies([]);

    const requestData = {
      tabular_data: [headers, ...rawData],
      query: query,
      model_choice: modelChoice,
      cleaning_choices: cleaningChoices,
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
    if (!rawData) return [];
    return rawData.map(row => row.map(Number)).filter(row => row.every(val => !isNaN(val)));
  }, [rawData]);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <main className="main-canvas">
      {view === 'upload' && (
        <motion.div className="card" variants={cardVariants} initial="hidden" animate="visible">
          <FileUploadZone onFileParsed={handleFileParsed} />
        </motion.div>
      )}

      {view === 'profile' && (
        <DataHealthReport report={healthReport} fileName={fileName} onProceed={proceedToAnalysis} />
      )}
      
      {view === 'analysis' && (
        <>
          <motion.div className="card" variants={cardVariants} initial="hidden" animate="visible">
            <div className="model-selector">
              <span>Select AI Engine:</span>
              <label><input type="radio" value="gemini" checked={modelChoice === 'gemini'} onChange={() => setModelChoice('gemini')} /> Gemini API (Cloud)</label>
              <label><input type="radio" value="local" checked={modelChoice === 'local'} onChange={() => setModelChoice('local')} /> GPT-Neo (Local)</label>
            </div>
            <div className="chat-container">
              <ChatWindow messages={messages} />
              <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} disabled={!rawData} />
            </div>
          </motion.div>

          {featureImportances && (
            <motion.div className="card" variants={cardVariants} initial="hidden" animate="visible">
                <FeatureImportanceChart data={featureImportances} />
            </motion.div>
          )}
          
          {rawData && (
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
          )}
        </>
      )}
    </main>
  );
}

export default MainCanvas;