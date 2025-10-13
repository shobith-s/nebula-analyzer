import React, { useMemo, useState } from "react";
import type { ProfileSummary, Message, MessagePayload } from "../types";
import ChatInput from "./ChatInput";
import ChatWindow from "./ChatWindow";
import DataChart from "./DataChart";

// Minimal table block for payloads.data.rows
const TableBlock: React.FC<{ title?: string; rows: any[] }> = ({ title, rows }) => {
  if (!rows || rows.length === 0) return null;
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r || {}))));
  return (
    <div className="card">
      {title && <div className="section-title">{title}</div>}
      <div className="table-wrap">
        <table className="nebula-table">
          <thead>
            <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {headers.map((h) => (
                  <td key={h}>
                    {r && r[h] !== undefined && r[h] !== null
                      ? typeof r[h] === "number"
                        ? r[h].toLocaleString()
                        : String(r[h])
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
}: {
  summary: ProfileSummary;
  apiBase: string;
}) {
  const [isLoading, setIsLoading] = useState(false);

  // LEFT PANE: chat log (scrollable)
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: `Dataset "${summary.filename}" loaded. Ask a question`,
    },
  ]);

  // RIGHT PANE: flattened list of payloads to render
  const [aiPayloads, setAiPayloads] = useState<MessagePayload[]>([]);

  const allPayloads = useMemo(() => aiPayloads, [aiPayloads]);

  async function ask(question: string) {
    if (!question.trim()) return;
    setIsLoading(true);

    // echo in left log
    setMessages((prev) => [...prev, { sender: "user", text: question }]);

    try {
      const res = await fetch(`${apiBase}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context: { profile: summary } }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || res.statusText);
      }
      const data = (await res.json()) as { messages: Message[] };

      // Append AI text to left log (if any)
      const aiTexts: Message[] = (data.messages || [])
        .map((m) =>
          m.payloads && m.payloads.length
            ? { sender: "ai", text: m.payloads.map((p) => p.title || p.type).join(" • ") }
            : m
        );
      if (aiTexts.length) setMessages((prev) => [...prev, ...aiTexts]);

      // Collect payloads to the right pane
      const newPayloads = (data.messages || []).flatMap((m) => m.payloads || []);
      if (newPayloads.length) setAiPayloads((prev) => [...prev, ...newPayloads]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: `Error: ${err?.message || String(err)}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="analysis-grid">
      {/* LEFT: Scrollable chat panel (same visual weight as right) */}
      <div className="chat-column">
        <div className="left-pane">
          {/* scrollable area */}
          <div className="left-scroll">
            <ChatWindow messages={messages} />
          </div>

          {/* docked input at bottom */}
          <div className="left-input-dock">
            <ChatInput
              onSendMessage={(q) => ask(q)}
              isLoading={isLoading}
              disabled={false}
            />
          </div>
        </div>
      </div>

      {/* RIGHT: Results */}
      <div className="results-column">
        {allPayloads.length === 0 ? (
          <div className="results-placeholder muted">Analysis workspace goes here…</div>
        ) : (
          allPayloads.map((p, i) => {
            if (p.type === "text") {
              return (
                <div className="card" key={i}>
                  {p.title && <div className="section-title">{p.title}</div>}
                  <div
                    dangerouslySetInnerHTML={{
                      __html: p.data?.markdown || "",
                    }}
                  />
                </div>
              );
            }
            if (p.type === "table") {
              return <TableBlock key={i} title={p.title} rows={p.data?.rows || []} />;
            }
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
