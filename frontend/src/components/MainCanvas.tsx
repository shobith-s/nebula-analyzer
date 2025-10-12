import React, { useCallback, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import DataHealthReport, { ProfileSummary } from "./DataHealthReport";
import ResultsPanel from "./ResultsPanel";

const API_BASE = "/api";

type ViewMode = "welcome" | "profile" | "analyze";

const MainCanvas: React.FC = () => {
  const [view, setView] = useState<ViewMode>("welcome");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploaded" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const postJsonProfile = useCallback(async (file: File): Promise<ProfileSummary> => {
    const { headers, rows } = await new Promise<{ headers: string[]; rows: string[][] }>(
      (resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
          complete: (result) => {
            try {
              const rowsObj = result.data as Record<string, unknown>[];
              const hdrs =
                rowsObj.length > 0 ? Object.keys(rowsObj[0] ?? {}) : (result.meta.fields ?? []);
              const matrix = rowsObj.map((r) => hdrs.map((h) => String(r[h] ?? "")));
              resolve({ headers: hdrs, rows: matrix });
            } catch (e) {
              reject(e);
            }
          },
          error: (err) => reject(err),
        });
      }
    );

    const res = await fetch(`${API_BASE}/profile-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        tabular_data: { headers, rows },
      }),
    });

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const text = await res.text();
        if (text) msg = `${msg}: ${text}`;
      } catch {}
      throw new Error(msg);
    }

    const data = (await res.json()) as ProfileSummary;
    return data;
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setBusy(true);
      setStatus("idle");
      try {
        const summary = await postJsonProfile(file);
        setProfile(summary);
        setStatus("uploaded");
        setView("profile");
      } catch (e: any) {
        setError(e?.message || "Upload failed");
        setStatus("error");
      } finally {
        setBusy(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [postJsonProfile]
  );

  const onBrowseClick = () => fileInputRef.current?.click();

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  const headerBadge = useMemo(() => {
    if (busy) return "Processing…";
    if (status === "uploaded") return "Ready for Analysis";
    if (status === "error") return "Error";
    return "Ready for Analysis";
  }, [busy, status]);

  return (
    <main className="main-canvas">
      <div className="toolbar glass holo-border">
        <div className="brand-left">
          <span className="brand">
            Welcome to NEBULA <span className="pill">v0.1</span>
          </span>
        </div>
        <div className={`status-badge ${busy ? "thinking" : status === "error" ? "error" : "ok"}`}>
          {headerBadge}
        </div>
      </div>

      {view === "welcome" && (
        <section className="welcome card glass holo-border">
          <div className="welcome-head">
            <h2>Drop a CSV to get a quality report and ask questions like:</h2>
            <div className="chips">
              {[
                "summary",
                "correlation",
                "top 5 by Salary",
                "mean of Age",
                "count by Department where Score ≥ 4.5",
              ].map((t) => (
                <span key={t} className="chip">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div
            className={`dropzone ${busy ? "disabled" : ""}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onClick={onBrowseClick}
            role="button"
            tabIndex={0}
          >
            <div className="dz-inner">
              <div className="dz-title">Drag & drop your CSV</div>
              <div className="dz-sub">or click anywhere in this box</div>
              <div className="dz-meta">(max 20 MB)</div>
            </div>
          </div>

          {/* Hidden native input (no inline styles) */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onFileInputChange}
            className="visually-hidden"
          />

          {error && <div className="alert error">{error}</div>}
        </section>
      )}

      {view === "profile" && (
        <section className="profile-panel card glass holo-border profile-panel-scroll">
          {profile ? (
            <DataHealthReport summary={profile} onProceed={() => setView("analyze")} />
          ) : (
            <div className="results-placeholder">No profile to show.</div>
          )}
        </section>
      )}

      {view === "analyze" && (
        <section className="analysis-grid">
          <div className="panel glass holo-border chat-column">
            <div className="model-selector">
              <label>
                <input type="radio" name="model" defaultChecked /> Gemini API (Cloud)
              </label>
              <label>
                <input type="radio" name="model" /> GPT-Neo (Local)
              </label>
            </div>

            <div className="chat-container">
              <div className="chat-window">
                <div className="chat-message ai">
                  <div className="message-bubble">Ask a question to generate insights…</div>
                </div>
              </div>

              <div className="chat-input-container">
                <textarea
                  placeholder='Ask a question about your file (e.g., “correlation heatmap”, “mean of price”, “top 5 by salary”).'
                  aria-label="Ask a question"
                />
                <button className="btn-primary" disabled={busy}>
                  Send
                </button>
              </div>
            </div>
          </div>

          <div className="panel glass holo-border results-column">
            <ResultsPanel />
          </div>
        </section>
      )}
    </main>
  );
};

export default MainCanvas;
