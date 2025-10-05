import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

import FileUploadZone from './FileUploadZone';
import DataHealthReport, { type CleaningChoices } from './DataHealthReport';
import ChatWindow from './ChatWindow';
import ChatInput from './ChatInput';
import ResultsPanel from './ResultsPanel';

import { type AIStatus, type Message } from '../types';

interface MainCanvasProps { setAiStatus: (status: AIStatus) => void; }

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
  const [outputs, setOutputs] = useState<any[]>([]);
  const [newBadge, setNewBadge] = useState(false);

  const cardVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

  const lastInsight = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].sender === 'ai') return messages[i].text;
    return null;
  }, [messages]);

  const quickActions = useMemo(() => {
    const lower = new Set(headers.map(h => h.toLowerCase()));
    const has = (name: string) => lower.has(name.toLowerCase());
    const actions: { label: string; query: string }[] = [
      { label: 'Summary', query: 'summary' },
      { label: 'Correlation', query: 'correlation heatmap' },
    ];
    if (has('Department')) actions.push({ label: 'Count by Department', query: 'count by Department' });
    if (has('Salary')) actions.push({ label: 'Top 5 by Salary', query: 'top 5 rows by Salary' });
    if (has('Salary') && has('Department')) actions.push({ label: 'Mean Salary by Department', query: 'mean Salary by Department' });
    if (has('PerformanceScore') && has('Department')) actions.push({ label: 'Count Dept (Score ≥ 4.5)', query: 'count by Department where PerformanceScore >= 4.5' });
    return actions;
  }, [headers]);

  const glance = useMemo(() => {
    if (!rawData || !headers) return null;
    const rows = rawData.length;
    const cols = headers.length;
    const missing = healthReport
      ? healthReport.column_profiles.reduce((s, c) => s + (c.missing_values || 0), 0)
      : 0;
    const denom = Math.max(rows * cols, 1);
    const missPct = (missing / denom) * 100;
    return { rows, cols, missPct };
  }, [rawData, headers, healthReport]);

  const handleFileParsed = async (data: string[][], hdrs: string[], name: string) => {
    setRawData(data); setHeaders(hdrs); setFileName(name); setView('profile');
    try {
      const response = await axios.post('http://127.0.0.1:8000/profile-data', { tabular_data: [hdrs, ...data] });
      setHealthReport(response.data);
    } catch (error) {
      console.error('Failed to profile data:', error);
      alert('Could not generate a data health report.');
      setView('upload');
    }
  };

  const proceedToAnalysis = (choices: CleaningChoices) => {
    setCleaningChoices(choices); setView('analysis'); setOutputs([]); setNewBadge(false);
    setMessages([{ sender: 'ai', text: `Successfully loaded and profiled ${fileName}. Cleaning plan approved.\nAsk a question to generate insights…` }]);
  };

  const handleSendMessage = async (query: string) => {
    if (!rawData || !headers) return;
    setMessages(prev => [...prev, { sender: 'user', text: query }]);
    setIsLoading(true); setAiStatus('thinking');

    const payload = { tabular_data: [headers, ...rawData], message: query, model_choice: modelChoice, narrative_mode: 'hybrid' };

    try {
      const { data } = await axios.post('http://127.0.0.1:8000/chat', payload);
      const insight = data?.outputs?.[0]?.data?.markdown ?? 'Done.';
      setMessages(prev => [...prev, { sender: 'ai', text: insight }]);
      const rest = (data?.outputs || []).filter((o: any) => !(o.type === 'text' && o.title === 'Insight'));
      setOutputs(rest);
      setNewBadge(true); window.setTimeout(() => setNewBadge(false), 2500);
      setAiStatus('success');
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) && err.response ? `Error from server: ${err.response.data.detail}` : 'Sorry, an error occurred while talking to the brain.';
      setMessages(prev => [...prev, { sender: 'ai', text: msg }]);
      setAiStatus('error');
    } finally { setIsLoading(false); }
  };

  const handleQuickAction = (query: string) => { if (!isLoading) handleSendMessage(query); };

  return (
    <main className="main-canvas">
      {view === 'upload' && (
        <motion.div className="card glass holo-border" variants={cardVariants} initial="hidden" animate="visible">
          <FileUploadZone onFileParsed={handleFileParsed} />
        </motion.div>
      )}

      {view === 'profile' && (
        <div className="card glass holo-border">
          <DataHealthReport report={healthReport} fileName={fileName} onProceed={proceedToAnalysis} />
        </div>
      )}

      {view === 'analysis' && (
        <div className="analysis-grid">
          {/* LEFT PANEL */}
          <div className="panel panel-sticky glass holo-border">
            <div className="model-selector">
              <span>Select AI Engine:</span>
              <label><input type="radio" value="gemini" checked={modelChoice === 'gemini'} onChange={() => setModelChoice('gemini')} /> Gemini API (Cloud)</label>
              <label><input type="radio" value="local" checked={modelChoice === 'local'} onChange={() => setModelChoice('local')} /> GPT-Neo (Local)</label>
            </div>

            {/* Quick actions */}
            <div className="quick-actions">
              {quickActions.map((a, idx) => (
                <button key={idx} onClick={() => handleQuickAction(a.query)} disabled={isLoading || !rawData} title={a.query} className="chip neon-chip">
                  {a.label}
                </button>
              ))}
            </div>

            {/* Glance KPIs */}
            {glance && (
              <div className="glance-bar">
                <div className="glance-card">
                  <div className="k">Rows</div>
                  <div className="v">{glance.rows.toLocaleString()}</div>
                </div>
                <div className="glance-card">
                  <div className="k">Columns</div>
                  <div className="v">{glance.cols}</div>
                </div>
                <div className="glance-card">
                  <div className="k">Missing</div>
                  <div className="v">{glance.missPct.toFixed(1)}%</div>
                </div>
              </div>
            )}

            {/* Sticky latest insight */}
            {lastInsight && (
              <div className="insight-sticky">
                <div className="insight-title">Latest Insight</div>
                <div className="insight-body">{lastInsight}</div>
              </div>
            )}

            {/* Console */}
            <div className="console-container">
              <ChatWindow messages={messages} />
              <div className="console-input"><ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} disabled={!rawData} /></div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="panel results-panel-scroll glass holo-border">
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
