import { useState } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import FileUploadZone from "./components/FileUploadZone";
import DataHealthReport from "./components/DataHealthReport";
import ResultsPanel from "./components/ResultsPanel";
import type { ProfileSummary } from "./types";
import "./App.css";
// ADD: fallback builder
const buildFallbackProfile = (
  rows: string[][],
  headers: string[],
  fileName: string
): ProfileSummary => ({
  filename: fileName,
  n_rows: rows.length,
  n_cols: headers.length,
  columns: headers.map((h) => ({
    name: h,
    dtype: "unknown",
    missing: 0,
    outliers: 0,
  })),
  quality_score: undefined,
  missing_total: undefined,
  duplicates_total: undefined,
  suggestions: [
    "Handle missing values appropriately (impute or drop).",
    "Remove duplicate rows if not intentional.",
    "Cast columns to correct data types.",
    "Check outliers for validity.",
  ],
});


type View = "upload" | "report" | "analysis";

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [view, setView] = useState<View>("upload");
  const [summary, setSummary] = useState<ProfileSummary | null>(null);

  // Called after CSV is parsed + (optionally) profiled by backend
  const handleProfileReady = (profile: ProfileSummary) => {
    setSummary(profile);
    setView("report");
  };

  const handleProceedToAnalysis = () => setView("analysis");

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-100">
      <Header onToggleSidebar={() => setCollapsed((c) => !c)} />

      {/* Fixed desktop sidebar (no nav buttons) */}
      <Sidebar collapsed={collapsed} />

      {/* Main content offset by sidebar width */}
      <main
  style={{
    marginLeft: collapsed ? 72 : 240,
    padding: "80px 32px 24px", // top = 64 header + 16 breathing
    minHeight: "100vh",
  }}
>
        <div style={{ maxWidth: 1400, marginInline: "auto" }}>
          {view === "upload" && (
            <section className="panel p-8">
              <h1 className="text-2xl font-semibold tracking-tight mb-6">
                Drop a CSV to get a quality report, then ask questions.
              </h1>

              {/* IMPORTANT: ensure FileUploadZone calls onProfileReady(profile) */}
              <FileUploadZone
  // If the server profile doesn’t arrive, this fallback guarantees navigation to Report
  onFileParsed={(rows, headers, fileName) => {
    const fallback = buildFallbackProfile(rows, headers, fileName);
    setSummary(fallback);
    setView("report");
  }}

  // When backend profile arrives, we prefer that and still go to Report
  onProfileReady={(profile) => {
    setSummary(profile);
    setView("report");
  }}

  // Show/log errors but DO NOT block navigation
  onError={(m) => {
    console.error(m);
    // no-op; onFileParsed already constructed a fallback summary above
  }}

  // IMPORTANT: point to your FastAPI host (Vite is :5173, FastAPI often :8000)
  // If your API is at http://127.0.0.1:8000, set that here:
  profileEndpoint="http://127.0.0.1:8000/profile-data"

  // Try server profile; if it fails we still fall back via onFileParsed
  useBackendProfile={true}
/>

            </section>
          )}

          {view === "report" && summary && (
            <section className="panel p-8">
              <DataHealthReport summary={summary} onProceed={handleProceedToAnalysis} />
            </section>
          )}

          {view === "analysis" && summary && (
  <section className="panel p-8">
    <ResultsPanel summary={summary} apiBase="http://127.0.0.1:8000" />
  </section>
)}

        </div>
      </main>
    </div>
  );
}
