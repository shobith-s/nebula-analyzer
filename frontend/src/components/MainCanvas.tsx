import React, { useCallback, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import DataHealthReport from "./DataHealthReport";
import ResultsPanel, { type Output } from "./ResultsPanel";
import type { ProfileSummary } from "../types";

type ViewMode = "welcome" | "profile" | "analysis";
type LoadStatus = "idle" | "uploaded" | "error";
const API_BASE = "/api";

/** CSV -> simple tabular (headers, rows) */
async function parseCsv(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  return await new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (result) => {
        try {
          const rowsObj = result.data as Record<string, unknown>[];
          const headers =
            rowsObj.length > 0 ? Object.keys(rowsObj[0] ?? {}) : (result.meta.fields ?? []);
          const rows = rowsObj.map((r) => headers.map((h) => String(r[h] ?? "")));
          resolve({ headers, rows });
        } catch (e) {
          reject(e);
        }
      },
      error: (err) => reject(err),
    });
  });
}

/** POST JSON compact profile to backend compat endpoint */
async function postJsonProfile(file: File): Promise<ProfileSummary> {
  const { headers, rows } = await parseCsv(file);

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

  // The backend may return a minimal summary; we normalize optional fields here
  const raw = (await res.json()) as any;
  const normalized: ProfileSummary = {
    filename: raw.filename ?? file.name,
    n_cols: raw.n_cols ?? (headers?.length ?? 0),
    n_rows: raw.n_rows ?? (rows?.length ?? 0),
    quality_score: raw.quality_score, // optional
    missing_total: raw.missing_total, // optional
    duplicates_total: raw.duplicates_total, // optional
    columns: raw.columns, // optional: [{name,dtype,missing,outliers}, ...]
    suggestions: raw.suggestions, // optional
  };
  return normalized;
}

const MainCanvas: React.FC = () => {
  const [view, setView] = useState<ViewMode>("welcome");
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [outputs, setOutputs] = useState<Output[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const askRef = useRef<HTMLTextAreaElement | null>(null);

  const headerBadge = useMemo(() => {
    if (busy) return "Processing…";
    if (status === "error") return "Error";
    if (status === "uploaded") return "Ready for Analysis";
    return "Ready for Analysis";
  }, [busy, status]);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setBusy(true);
    setStatus("idle");
    try {
      const summary = await postJsonProfile(file);
      setProfile(summary);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setStatus("uploaded");
      setView("profile");
    } catch (e: any) {
      setError(e?.message || "Upload failed");
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }, []);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const onBrowseClick = () => fileInputRef.current?.click();
  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
  };

  const onSend = () => {
    const q = askRef.current?.value?.trim();
    if (!q) return;
    // Demo: echo as a table. Replace with real /analyze call later.
    setOutputs((prev) => [
      {
        type: "text",
        title: "Query",
        data: { markdown: q },
      },
      {
        type: "table",
        title: "Sample result",
        data: {
          rows: [
            { metric: "rows", value: profile?.n_rows ?? 0 },
            { metric: "columns", value: profile?.n_cols ?? 0 },
          ],
        },
      },
    ]);
    askRef.current!.value = "";
  };

  return (
    <main className="main-canvas">
      {/* Top toolbar */}
      <div className="toolbar glass holo-border">
        <div className="brand-left">
          <span className="brand">
            NEBULA Analyzer <span className="pill">v0.1</span>
          </span>
        </div>
        <div className={`status-badge ${busy ? "thinking" : status === "error" ? "error" : "ok"}`}>
          {headerBadge}
        </div>
      </div>

      {/* Welcome / Upload */}
      {view === "welcome" && (
        <section className="welcome card glass holo-border">
          <h2>Drop a CSV to get a quality report, then ask questions.</h2>

          <div className="chips">
            {["summary", "correlation", "top 5 by Salary", "mean of Age", "count by Department where Score ≥ 4.5"].map(
              (t) => (
                <span key={t} className="chip">
                  {t}
                </span>
              )
            )}
          </div>

          <div className={`dropzone ${busy ? "disabled" : ""}`} onDrop={onDrop} onDragOver={onDragOver}>
            <div className="dz-title">Drag & drop your CSV</div>
            <button className="btn-secondary" onClick={onBrowseClick} disabled={busy}>
              Browse file
            </button>
            <div className="dz-meta">(max 20 MB) or click anywhere in this box</div>

            {/* Hidden native input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={onFileInputChange}
              className="visually-hidden"
              aria-hidden="true"
            />
          </div>

          {error && <div className="alert error">{error}</div>}
        </section>
      )}

      {/* Profile / Data Health */}
      {view === "profile" && profile && (
        <section className="profile-panel card glass holo-border profile-panel-scroll">
          <DataHealthReport summary={profile} onProceed={() => setView("analysis")} />
        </section>
      )}

      {/* Analysis workspace */}
      {view === "analysis" && (
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

            <div className="chat-window">
              <div className="chat-message ai">
                <div className="message-bubble">Ask a question to generate insights…</div>
              </div>
            </div>

            <div className="chat-input-container">
              <textarea
                ref={askRef}
                placeholder='E.g., “summary”, “correlation of price, area”, “feature importance for price”.'
                aria-label="Ask a question"
              />
              <button className="btn-primary" disabled={busy} onClick={onSend}>
                Send
              </button>
            </div>
          </div>

          <div className="panel glass holo-border results-column">
            <ResultsPanel outputs={outputs} />
          </div>
        </section>
      )}
    </main>
  );
};

export default MainCanvas;
