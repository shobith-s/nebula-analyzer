import React, { useMemo, useState } from "react";
import type { ProfileSummary, Message, MessagePayload, TabularPreview, ModelChoice } from "../types";
import ChatInput from "./ChatInput";
import ChatWindow from "./ChatWindow";
import DataChart from "./DataChart";

const TableBlock: React.FC<{ title?: string; rows: any[] }> = ({ title, rows }) => {
  if (!rows || rows.length === 0) return null;
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r || {}))));
  return (
    <div className="card">
      {title && <div className="section-title">{title}</div>}
      <div className="table-wrap">
        <table className="nebula-table">
          <thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {headers.map((h) => (
                  <td key={h}>
                    {r && r[h] !== undefined && r[h] !== null
                      ? typeof r[h] === "number" ? r[h].toLocaleString() : String(r[h])
                      : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function ResultsPanel({
  summary,
  apiBase,
  preview,
}: {
  summary: ProfileSummary;
  apiBase: string;
  preview?: TabularPreview;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<ModelChoice>("local"); // default local if Gemini is flaky

  const [messages, setMessages] = useState<Message[]>([
    { sender: "ai", text: `Dataset "${summary.filename}" loaded. Choose a model (Local/Gemini). Ask: "summary", "preprocessing plan", "histogram Price", "scatter Reviews vs User Rating", "value counts Genre".` },
  ]);

  const [aiPayloads, setAiPayloads] = useState<MessagePayload[]>([]);
  const allPayloads = useMemo(() => aiPayloads, [aiPayloads]);

  async function ask(question: string) {
    if (!question.trim()) return;
    setIsLoading(true);
    setMessages((prev) => [...prev, { sender: "user", text: question }]);
    try {
      const res = await fetch(`${apiBase}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          model_choice: model, // NEW
          context: {
            profile: summary,
            tabular_preview: preview, // NEW
          },
        }),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || res.statusText);
      const data = (await res.json()) as { messages: Message[] };

      // Log full AI text on the left if present
      const aiToLog: Message[] = [];
      for (const m of data.messages || []) {
        const textPayload = (m.payloads || []).find((p) => p.type === "text" && p.data?.markdown);
        if (textPayload) aiToLog.push({ sender: "ai", text: textPayload.data.markdown });
        else if (m.text) aiToLog.push({ sender: "ai", text: m.text });
      }
      if (aiToLog.length) setMessages((prev) => [...prev, ...aiToLog]);

      const newPayloads = (data.messages || []).flatMap((m) => m.payloads || []);
      if (newPayloads.length) setAiPayloads((prev) => [...prev, ...newPayloads]);
    } catch (e: any) {
      setMessages((prev) => [...prev, { sender: "ai", text: `Error: ${e?.message || String(e)}` }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="analysis-grid">
      {/* LEFT: log + selector + docked input */}
      <div className="chat-column">
        <div className="left-pane">
          <div className="left-scroll">
            {/* Model selector */}
            <div className="model-selector" style={{ marginBottom: 12 }}>
              <label><input type="radio" name="model" checked={model === "local"} onChange={() => setModel("local")} /> Local (GPT-Neo)</label>
              <label><input type="radio" name="model" checked={model === "gemini"} onChange={() => setModel("gemini")} /> Cloud (Gemini)</label>
            </div>
            <ChatWindow messages={messages} />
          </div>
          <div className="left-input-dock">
            <ChatInput onSendMessage={(q) => ask(q)} isLoading={isLoading} disabled={false} />
          </div>
        </div>
      </div>

      {/* RIGHT: results */}
      <div className="results-column">
        {allPayloads.length === 0 ? (
          <div className="results-placeholder muted">Analysis workspace goes here…</div>
        ) : (
          allPayloads.map((p, i) => {
            if (p.type === "text") {
              return (
                <div className="card" key={i}>
                  {p.title && <div className="section-title">{p.title}</div>}
                  <div dangerouslySetInnerHTML={{ __html: p.data?.markdown || "" }} />
                </div>
              );
            }
            if (p.type === "table") return <TableBlock key={i} title={p.title} rows={p.data?.rows || []} />;
            if (p.type === "chart") {
              return (
                <div className="card" key={i}>
                  <DataChart spec={p.data?.spec} title={p.title} />
                </div>
              );
            }
            if (p.type === "metric") {
              return (
                <div className="card" key={i}>
                  {p.title && <div className="section-title">{p.title}</div>}
                  <pre>{JSON.stringify(p.data, null, 2)}</pre>
                </div>
              );
            }
            return null;
          })
        )}
      </div>
    </div>
  );
}
