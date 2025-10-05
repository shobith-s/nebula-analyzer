import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

import FileUploadZone from './FileUploadZone';
import DataHealthReport, { type CleaningChoices } from './DataHealthReport';
import ChatWindow from './ChatWindow';
import ChatInput from './ChatInput';
import ResultsPanel from './ResultsPanel';

import { type AIStatus, type Message } from '../types';

interface MainCanvasProps {
  setAiStatus: (status: AIStatus) => void;
}

// Types for the health report
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

function MainCanvas({ setAiStatus }: MainCanvasProps) {
  const [view, setView] = useState<'upload' | 'profile' | 'analysis'>('upload');
  const [rawData, setRawData] = useState<string[][] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [cleaningChoices, setCleaningChoices] = useState<CleaningChoices | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modelChoice, setModelChoice] = useState<'gemini' | 'local'>('gemini');
  const [outputs, setOutputs] = useState<any[]>([]); // results from backend (tables, heatmaps, etc.)
  const [newBadge, setNewBadge] = useState(false);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const lastInsight = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'ai') return messages[i].text;
    }
    return null;
  }, [messages]);

  // Build quick actions based on known headers
  const quickActions = useMemo(() => {
    const lower = new Set(headers.map(h => h.toLowerCase()));
    const has = (name: string) => lower.has(name.toLowerCase());

    const actions: { label: string; query: string }[] = [
      { label: 'Summary', query: 'summary' },
      { label: 'Correlation', query: 'correlation heatmap' },
    ];

    if (has('Department')) {
      actions.push({ label: 'Count by Department', query: 'count by Department' });
    }
    if (has('Salary')) {
      actions.push({ label: 'Top 5 by Salary', query: 'top 5 rows by Salary' });
    }
    if (has('Salary') && has('Department')) {
      actions.push({ label: 'Mean Salary by Department', query: 'mean Salary by Department' });
    }
    if (has('PerformanceScore') && has('Department')) {
      actions.push({
        label: 'Count Dept (Score ≥ 4.5)',
        query: 'count by Department where PerformanceScore >= 4.5',
      });
    }
    return actions;
  }, [headers]);

  const handleFileParsed = async (data: string[][], hdrs: string[], name: string) => {
    setRawData(data);
    setHeaders(hdrs);
    setFileName(name);
    setView('profile');

    try {
      const response = await axios.post('http://127.0.0.1:8000/profile-data', {
        tabular_data: [hdrs, ...data],
      });
      setHealthReport(response.data);
    } catch (error) {
      console.error('Failed to profile data:', error);
      alert('Could not generate a data health report.');
      setView('upload');
    }
  };

  const proceedToAnalysis = (choices: CleaningChoices) => {
    setCleaningChoices(choices);
    setView('analysis');
    setMessages([
      {
        sender: 'ai',
        text: `Successfully loaded and profiled ${fileName}. Cleaning plan approved.\nAsk a question to generate insights…`,
      },
    ]);
    setOutputs([]);
    setNewBadge(false);
  };

  const handleSendMessage = async (query: string) => {
    if (!rawData || !headers) return;

    setMessages(prev => [...prev, { sender: 'user', text: query }]);
    setIsLoading(true);
    setAiStatus('thinking');

    const payload = {
      tabular_data: [headers, ...rawData],
      message: query,
      model_choice: modelChoice,
      narrative_mode: 'hybrid',
      // cleaning choices already applied server-side if needed
    };

    try {
      const { data } = await axios.post('http://127.0.0.1:8000/chat', payload);
      const insight = data?.outputs?.[0]?.data?.markdown ?? 'Done.';
      setMessages(prev => [...prev, { sender: 'ai', text: insight }]);

      // keep all payloads except the first Insight text block
      const rest = (data?.outputs || []).filter(
        (o: any) => !(o.type === 'text' && o.title === 'Insight')
      );
      setOutputs(rest);

      // flash "new" badge briefly
      setNewBadge(true);
      window.setTimeout(() => setNewBadge(false), 2500);

      setAiStatus('success');
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response
          ? `Error from server: ${err.response.data.detail}`
          : 'Sorry, an error occurred while talking to the brain.';
      setMessages(prev => [...prev, { sender: 'ai', text: msg }]);
      setAiStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (query: string) => {
    if (!isLoading) handleSendMessage(query);
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
        <div className="analysis-grid">
          {/* LEFT: console panel (sticky) */}
          <div className="panel panel-sticky">
            <div className="model-selector">
              <span>Select AI Engine:</span>
              <label>
                <input
                  type="radio"
                  value="gemini"
                  checked={modelChoice === 'gemini'}
                  onChange={() => setModelChoice('gemini')}
                />{' '}
                Gemini API (Cloud)
              </label>
              <label>
                <input
                  type="radio"
                  value="local"
                  checked={modelChoice === 'local'}
                  onChange={() => setModelChoice('local')}
                />{' '}
                GPT-Neo (Local)
              </label>
            </div>

            {/* Quick actions */}
            {quickActions.length > 0 && (
              <div className="quick-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {quickActions.map((a, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickAction(a.query)}
                    disabled={isLoading || !rawData}
                    title={a.query}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}

            {/* Sticky latest insight header */}
            {lastInsight && (
              <div className="insight-sticky">
                <div className="insight-title">Latest Insight</div>
                <div className="insight-body">{lastInsight}</div>
              </div>
            )}

            {/* Console */}
            <div className="console-container">
              <ChatWindow messages={messages} />
              <div className="console-input">
                <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} disabled={!rawData} />
              </div>
            </div>
          </div>

          {/* RIGHT: results (heatmaps, tables, notes) */}
          <div className="panel results-panel-scroll">
            <div className="results-header">
              <span>Results</span>
              {newBadge ? <span className="pill pill-live">● new</span> : null}
            </div>
            <ResultsPanel outputs={outputs} />
          </div>
        </div>
      )}
    </main>
  );
}

export default MainCanvas;
