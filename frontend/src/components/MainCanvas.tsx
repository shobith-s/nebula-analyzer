import { useMemo, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

import FileUploadZone from './FileUploadZone';
import DataHealthReport, { type CleaningChoices } from './DataHealthReport';

import ChatWindow from './ChatWindow';
import ChatInput from './ChatInput';
import FeatureImportanceChart from './FeatureImportanceChart';

import { type AIStatus, type ImportanceData, type Message } from '../types';

interface ColumnProfile {
  column_name: string;
  data_type: string;
  missing_values: number;
  missing_percentage: number;
  outlier_count: number;
}
interface HealthReport {
  general_stats: { total_rows: number; duplicate_rows: number };
  column_profiles: ColumnProfile[];
}

interface MainCanvasProps {
  setAiStatus: (status: AIStatus) => void;
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
  const [modelChoice, setModelChoice] = useState<'gemini' | 'local'>('gemini');

  const [anomalies, setAnomalies] = useState<number[]>([]); // kept for compatibility

  // ---------- Upload -> Profile ----------
  const handleFileParsed = async (data: string[][], hdrs: string[], fname: string) => {
    setRawData(data);
    setHeaders(hdrs);
    setFileName(fname);
    setView('profile');

    try {
      const response = await axios.post('http://127.0.0.1:8000/profile-data', {
        tabular_data: [hdrs, ...data],
      });
      setHealthReport(response.data);
    } catch (err) {
      console.error('Failed to profile data:', err);
      alert('Could not generate a data health report.');
      setView('upload');
    }
  };

  // ---------- Profile -> Analysis ----------
  const proceedToAnalysis = (choices: CleaningChoices) => {
    setCleaningChoices(choices);
    setView('analysis');
    setMessages([
      {
        sender: 'ai',
        text: `Successfully loaded and profiled ${fileName}. Cleaning plan approved. What would you like to know?`,
      },
    ]);
  };

  // ---------- Chat / Insight ----------
  const handleSendMessage = async (query: string) => {
    if (!rawData || !headers) return;

    setMessages((prev) => [...prev, { sender: 'user', text: query }]);
    setIsLoading(true);
    setAiStatus('thinking');
    setFeatureImportances(null);
    setAnomalies([]);

    // Using /analyze keeps things dataset-id free and compatible with your current backend.
    const requestData = {
      tabular_data: [headers, ...rawData],
      query,
      model_choice: modelChoice,
      cleaning_choices: cleaningChoices,
    };

    try {
      const apiUrl = 'http://127.0.0.1:8000/analyze';
      const { data } = await axios.post(apiUrl, requestData);

      setMessages((prev) => [...prev, { sender: 'ai', text: data.insight }]);
      setFeatureImportances(data.feature_importances);
      setAnomalies(data.anomalies || []);
      setAiStatus('success');
    } catch (error) {
      const msg =
        axios.isAxiosError(error) && error.response
          ? `Error from server: ${error.response.data.detail}`
          : 'Sorry, an error occurred while talking to the brain.';
      setMessages((prev) => [...prev, { sender: 'ai', text: msg }]);
      setAiStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Numeric data for any local charts/tables you keep
  const numericDataForViz = useMemo(() => {
    if (!rawData) return [];
    return rawData
      .map((row) => row.map(Number))
      .filter((row) => row.every((v) => !Number.isNaN(v)));
  }, [rawData]);

  const cardVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
  };

  return (
    <main className="main-canvas">
      {/* UPLOAD — vertically centered, constrained width */}
      {view === 'upload' && (
        <div className="upload-shell">
          <motion.div
            className="card glass holo-border upload-card"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <FileUploadZone onFileParsed={handleFileParsed} />
          </motion.div>
        </div>
      )}

      {/* PROFILE — scrollable inside panel; sticky bottom Proceed */}
      {view === 'profile' && (
        <div className="panel profile-panel-scroll glass holo-border">
          <DataHealthReport report={healthReport} fileName={fileName} onProceed={proceedToAnalysis} />
        </div>
      )}

      {/* ANALYSIS — left: chat/console, right: results (your charts/tables as before) */}
      {view === 'analysis' && (
        <div className="analysis-grid">
          {/* LEFT: chat console */}
          <motion.div className="panel glass holo-border" variants={cardVariants} initial="hidden" animate="visible">
            <div className="model-selector">
              <span>Select AI Engine:</span>
              <label>
                <input
                  type="radio"
                  value="gemini"
                  checked={modelChoice === 'gemini'}
                  onChange={() => setModelChoice('gemini')}
                />
                Gemini API (Cloud)
              </label>
              <label>
                <input
                  type="radio"
                  value="local"
                  checked={modelChoice === 'local'}
                  onChange={() => setModelChoice('local')}
                />
                GPT-Neo (Local)
              </label>
            </div>

            <div className="chat-container">
              <ChatWindow messages={messages} />
              <div className="console-input">
                <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} disabled={!rawData} />
              </div>
            </div>
          </motion.div>

          {/* RIGHT: results */}
          <motion.div className="panel glass holo-border results-panel" variants={cardVariants} initial="hidden" animate="visible">
            {featureImportances ? (
              <FeatureImportanceChart data={featureImportances} />
            ) : (
              <div className="results-placeholder">Ask a question to generate insights…</div>
            )}
          </motion.div>
        </div>
      )}
    </main>
  );
}

export default MainCanvas;
