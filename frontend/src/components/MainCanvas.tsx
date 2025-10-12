import React, { useCallback, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import ResultsPanel, { Output } from "./ResultsPanel";
import DataHealthReport from "./DataHealthReport";
import type { ProfileSummary } from "../types";

type ViewMode = "welcome" | "profile" | "analysis";
type LoadStatus = "idle" | "uploaded" | "error";

const API_BASE = "/api";

const MainCanvas: React.FC = () => {
  const [view, setView] = useState<ViewMode>("welcome");
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);

  // analysis demo state
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [prompt, setPrompt] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const headerBadge = useMemo(() => {
    if (busy) return "Processing…";
    if (status === "uploaded") return "Ready for Analysis";
    if (status === "error") return "Error";
    return "Ready for Analysis";
  }, [busy, status]);

  /** CSV → headers + rows (string[][]) */
  const parseCsv = useCallback(
    (file: File): Promise<{ headers: string[]; rows: string[][] }> =>
      new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
          complete: (result) => {
            try {
              const rowsObj = result.data as Record<string, unknown>[];
              const headers =
                rowsObj.length > 0
                  ? Object.keys(rowsObj[0] ?? {})
                  : (result.meta.fields ?? []);
              const rows = rowsObj.map((r) => headers.map((h) => String(r[h] ?? "")));
              resolve({ headers, rows });
            } catch (e) {
              reject(e);
            }
          },
          error: (err) => reject(err),
        });
      }),
    []
  );

  /** POST compact JSON to backend compat endpoint */
  const postJsonProfile = useCallback(
    async (file: File): Promise<ProfileSummary> => {
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
        } catch {
          /* noop */
        }
        throw new Error(msg);
      }
      return (await res.json()) as ProfileSummary;
    },
    [parseCsv]
  );

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setBusy(true);
      setStatus("idle");
      try {
        const summary = await postJsonProfile(file);

        // If backend returns only top-level counts, ensure safe defaults
        const safeSummary: ProfileSummary = {
          filename: summary.filename,
          n_rows: summary.n_rows,
          n_cols: summary.n_cols,
          quality_score: summary.quality_score ?? null,
          columns: summary.columns ?? [],
          missing_total: summary.missing_total ?? undefined,
          duplicates_total: summary.duplicates_total ?? undefined,
          suggestions:
            summary.suggestions ??
            [
              "Handle missing values appropriately (impute or drop).",
              "Remove duplicate rows if not intentional.",
              "Cast columns to correct data types.",
              "Check outliers for validity.",
            ],
        };

        setProfile(safeSummary);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setStatus("uploaded");
        setView("profile");
      } catch (e: any) {
        setError(e?.message || "Upload failed");
        setStatus("error");
      } finally {
        setBusy(false);
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

  // --- Analysis demo handler (works offline, good for a presentation)
  const sendPrompt = () => {
    if (!prompt.trim()) return;
    const p = prompt.trim();

    // demo: add one "text" and one "table" output
    const next: Output[] = [
      {
        type: "text",
        title: "Insight",
        data: { markdown: `**You asked:** ${p}` },
      },
      {
        type: "table",
        title: "Sample result",
        data: {
          rows: [
            { metric: "rows", value: profile?.n_rows ?? "—" },
            { metric: "columns", value: profile?.n_cols ?? "—" },
          ],
        },
      },
    ];
    setOutputs((o) => [...next, ...o]);
    setPrompt("");
  };

  return (
    <main className="main-canvas">
      {/* top strip */}
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
          <h2 className="section-title">Drop a CSV to get a quality report, then ask questions.</h2>

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

          <div
            className={`dropzone ${busy ? "disabled" : ""}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
          >
            <div className="dz-title">Drag & drop your CSV</div>
            <button className="btn-ghost" onClick={onBrowseClick} disabled={busy} type="button">
              Browse file
            </button>
            <div className="dz-meta">(max 20 MB) or click anywhere in this box</div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={onFileInputChange}
              className="visually-hidden"
            />
          </div>

          {error && <div className="alert error">{error}</div>}
        </section>
      )}

      {/* Profile / Data Health */}
      {view === "profile" && (
        <section className="profile-panel card glass holo-border profile-panel-scroll">
          {profile ? (
            <DataHealthReport
              summary={profile}
              onProceed={() => {
                setView("analysis");
              }}
            />
          ) : (
            <div className="results-placeholder">No profile to show.</div>
          )}
        </section>
      )}

      {/* Analysis */}
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
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='E.g., “summary”, “correlation of price, area”, “feature importance for price”.'
                aria-label="Ask a question"
              />
              <button className="btn-primary" onClick={sendPrompt} disabled={busy}>
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
