import React, { useMemo, useState } from 'react';
import FileUploadZone from './FileUploadZone';
import DataHealthReport from './DataHealthReport';
import ResultsPanel from './ResultsPanel';
import ChatWindow from './ChatWindow';
import Header from './Header';
import { type AIStatus } from '../types';

type Phase = 'idle' | 'profile' | 'analyze';

const MainCanvas: React.FC = () => {
  const [status, setStatus] = useState<AIStatus>('idle');
  const [phase, setPhase] = useState<Phase>('idle');

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Data returned by /profile-data
  const [profile, setProfile] = useState<any | null>(null);

  const resetErrors = () => setUploadError(null);

  const handleUploadParsed = async (
    rows: string[][],
    headers: string[],
    filename: string
  ) => {
    resetErrors();
    setStatus('thinking');
    setFileName(filename);

    try {
      // IMPORTANT: match backend schema
      const payload = {
        filename,
        tabular_data: {
          headers,
          rows,
        },
      };

      const res = await fetch('/profile-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // try to read json; fall back to text
        let message = `Server returned ${res.status}`;
        try {
          const j = await res.json();
          message = typeof j === 'string' ? j : JSON.stringify(j, null, 2);
        } catch {
          try {
            message = await res.text();
          } catch {
            /* no-op */
          }
        }
        throw new Error(message);
      }

      const data = await res.json();
      setProfile(data);
      setPhase('profile');
      setStatus('success');
    } catch (err: any) {
      setUploadError(
        `Upload failed\n${typeof err?.message === 'string' ? err.message : String(err)}`
      );
      setStatus('error');
    }
  };

  const headerStatus = useMemo<AIStatus>(() => status, [status]);

  return (
    <div className="app-container">
      <Header status={headerStatus} />

      {/* Left rail (toggle button lives in Header in your codebase; the rail itself is Sidebar.tsx) */}
      {/* Sidebar is already rendered outside or via parent layout. */}

      <main className="main-canvas">
        {/* Welcome / quick-hints capsule */}
        <section className="panel glass holo-border" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong>Welcome to NEBULA</strong>
            <span
              style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 999,
                background: 'rgba(129,140,248,.12)',
                border: '1px solid rgba(129,140,248,.25)',
              }}
            >
              v0.1
            </span>
          </div>

          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
            Drop a CSV to get a quality report and ask questions like:
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {['summary', 'correlation', 'top 5 by Salary', 'mean of Age', 'count by Department where Score ≥ 4.5'].map(
              (q) => (
                <span
                  key={q}
                  style={{
                    fontSize: 11,
                    padding: '4px 8px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,.04)',
                    border: '1px solid rgba(255,255,255,.08)',
                  }}
                >
                  {q}
                </span>
              )
            )}
          </div>
        </section>

        {/* Error banner (upload) */}
        {uploadError && (
          <section
            className="panel"
            style={{
              border: '1px solid rgba(236,72,153,.35)',
              background:
                'linear-gradient(180deg, rgba(236, 72, 153, 0.12), rgba(236, 72, 153, 0.04))',
              whiteSpace: 'pre-wrap',
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Upload failed</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>{uploadError}</div>
          </section>
        )}

        {/* Upload area (only visible when not in profile/analyze) */}
        {phase === 'idle' && (
          <section className="panel glass holo-border">
            <FileUploadZone
              onFileParsed={handleUploadParsed}
              onError={(msg) => setUploadError(msg)}
              maxSizeMB={20}
            />
          </section>
        )}

        {/* Profile report */}
        {phase === 'profile' && profile && (
          <section className="profile-panel-scroll">
            <DataHealthReport
              profile={profile}
              fileName={fileName || 'dataset.csv'}
              onProceed={() => {
                setPhase('analyze');
                setStatus('idle');
              }}
            />
          </section>
        )}

        {/* Analyze view */}
        {phase === 'analyze' && (
          <section className="analysis-grid">
            <div className="chat-container">
              <ChatWindow />
            </div>
            <div className="results-panel">
              <ResultsPanel />
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default MainCanvas;
