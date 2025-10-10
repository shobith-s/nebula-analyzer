import { useMemo, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import DataTable from "./DataTable";
import DataChart from "./DataChart";
import FeatureImportanceChart from "./FeatureImportanceChart";
import ChatInput from "./ChatInput";
import ChatWindow from "./ChatWindow";
import FileUploadZone from "./FileUploadZone";
import DataHealthReport from "./DataHealthReport";
import { type AIStatus, type ImportanceData } from "../types";

type View = "upload" | "profile" | "analysis";

interface MainCanvasProps {
  setAiStatus: (status: AIStatus) => void;
}

interface Message {
  sender: "user" | "ai";
  text: string;
}

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

export type CleaningChoices = {
  removeDuplicates: boolean;
  fillMissing: boolean;
};

export default function MainCanvas({ setAiStatus }: MainCanvasProps) {
  const [view, setView] = useState<View>("upload");

  // data state
  const [rawData, setRawData] = useState<string[][] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");

  // profiling
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [cleaningChoices, setCleaningChoices] = useState<CleaningChoices | null>(null);

  // analysis state
  const [featureImportances, setFeatureImportances] = useState<ImportanceData[] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modelChoice, setModelChoice] = useState<"gemini" | "local">("gemini");
  const [anomalies, setAnomalies] = useState<number[]>([]);
  const [xAxis, setXAxis] = useState<string>("");
  const [yAxis, setYAxis] = useState<string>("");

  // ---------- Upload flow ----------
  const handleFileParsed = async (data: string[][], hdrs: string[], fname: string) => {
    setRawData(data);
    setHeaders(hdrs);
    setFileName(fname);
    setView("profile");

    try {
      const response = await axios.post("http://127.0.0.1:8000/profile-data", {
        tabular_data: [hdrs, ...data],
      });
      setHealthReport(response.data);
    } catch (err) {
      console.error("profile-data failed:", err);
      alert("Could not generate a data health report.");
      setView("upload");
    }
  };

  // ---------- Profile → Analysis ----------
  const proceedToAnalysis = (choices: CleaningChoices) => {
    setCleaningChoices(choices);
    setMessages([
      {
        sender: "ai",
        text: `Successfully loaded and profiled ${fileName}. Cleaning plan approved. Ask a question to generate insights...`,
      },
    ]);
    setView("analysis");
  };

  // ---------- Chat submit ----------
  const handleSendMessage = async (query: string) => {
    if (!rawData || !headers) return;
    setMessages((m) => [...m, { sender: "user", text: query }]);
    setIsLoading(true);
    setAiStatus("thinking");
    setFeatureImportances(null);
    setAnomalies([]);

    const requestData = {
      tabular_data: [headers, ...rawData],
      query,
      model_choice: modelChoice,
      cleaning_choices: cleaningChoices,
    };

    try {
      const { data } = await axios.post("http://127.0.0.1:8000/analyze", requestData);
      setMessages((m) => [...m, { sender: "ai", text: data.insight }]);
      setFeatureImportances(data.feature_importances);
      setAnomalies(data.anomalies);
      setAiStatus("success");
    } catch (err: any) {
      const msg =
        axios.isAxiosError(err) && err.response
          ? `Error from server: ${err.response.data.detail}`
          : "Sorry, an error occurred while talking to the brain.";
      setMessages((m) => [...m, { sender: "ai", text: msg }]);
      setAiStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- Derived ----------
  const numericDataForViz = useMemo(() => {
    if (!rawData) return [];
    return rawData
      .map((row) => row.map(Number))
      .filter((row) => row.every((v) => !Number.isNaN(v)));
  }, [rawData]);

  // ---------- UI ----------
  const panelVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  return (
    <main className="main-canvas">
      {/* UPLOAD VIEW */}
      {view === "upload" && (
        <motion.section
          className="panel glass holo-border upload-shell"
          variants={panelVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="upload-card">
            <FileUploadZone onFileParsed={handleFileParsed} />
          </div>
        </motion.section>
      )}

      {/* PROFILE VIEW (scrolls safely inside itself) */}
      {view === "profile" && (
        <motion.section
          className="panel glass holo-border profile-panel-scroll"
          variants={panelVariants}
          initial="hidden"
          animate="visible"
        >
          <DataHealthReport report={healthReport} fileName={fileName} onProceed={proceedToAnalysis} />
        </motion.section>
      )}

      {/* ANALYSIS VIEW */}
      {view === "analysis" && (
        <section className="analysis-grid">
          {/* LEFT: Console column */}
          <motion.div
            className="panel glass holo-border console-col"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
          >
            {/* model selector */}
            <div className="model-selector">
              <span>AI Engine:</span>
              <label>
                <input
                  type="radio"
                  value="gemini"
                  checked={modelChoice === "gemini"}
                  onChange={() => setModelChoice("gemini")}
                />
                Gemini API (Cloud)
              </label>
              <label>
                <input
                  type="radio"
                  value="local"
                  checked={modelChoice === "local"}
                  onChange={() => setModelChoice("local")}
                />
                GPT-Neo (Local)
              </label>
            </div>

            {/* quick-actions */}
            <div className="quickbar">
              <button onClick={() => handleSendMessage("summary")} className="chip">
                Summary
              </button>
              <button onClick={() => handleSendMessage("correlation heatmap")} className="chip">
                Correlation
              </button>
              <button
                onClick={() => handleSendMessage("top 5 by Salary")}
                className="chip"
              >
                Top 5 by Salary
              </button>
              <button
                onClick={() => handleSendMessage("count by Department")}
                className="chip"
              >
                Count by Dept
              </button>
            </div>

            {/* chat feed (independent scroll) */}
            <div className="chat-window">
              <ChatWindow messages={messages} />
            </div>

            {/* input (sticky to bottom of column; no overlap) */}
            <div className="console-input">
              <ChatInput
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                disabled={!rawData}
              />
            </div>
          </motion.div>

          {/* RIGHT: Results column */}
          <motion.div
            className="panel glass holo-border results-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
          >
            {/* feature importance */}
            {featureImportances && featureImportances.length > 0 && (
              <div className="block">
                <h3 className="panel-title">Top Associations</h3>
                <FeatureImportanceChart data={featureImportances} />
              </div>
            )}

            {/* simple numeric viz area */}
            {rawData && (
              <div className="block">
                <div className="chart-controls">
                  <div className="select-wrapper">
                    <label>X:</label>
                    <select value={xAxis} onChange={(e) => setXAxis(e.target.value)}>
                      <option value="">(choose)</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="select-wrapper">
                    <label>Y:</label>
                    <select value={yAxis} onChange={(e) => setYAxis(e.target.value)}>
                      <option value="">(choose)</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <DataChart data={numericDataForViz} />
              </div>
            )}

            {/* table + anomalies */}
            {numericDataForViz.length > 0 && (
              <div className="block">
                <h3 className="panel-title">Preview</h3>
                <DataTable data={numericDataForViz} headers={headers} anomalies={anomalies} />
              </div>
            )}

            {(!featureImportances || featureImportances.length === 0) &&
              numericDataForViz.length === 0 && (
                <div className="results-placeholder">
                  <p>Ask a question to generate insights…</p>
                </div>
              )}
          </motion.div>
        </section>
      )}
    </main>
  );
}
