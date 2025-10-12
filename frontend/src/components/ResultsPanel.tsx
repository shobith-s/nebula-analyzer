import React from "react";

export type Output = {
  type: "text" | "table" | "chart";
  title?: string;
  data?: any;
};

type ResultsPanelProps = {
  outputs: Output[];
};

const numberFmt = (v: any) =>
  v === null || v === undefined || Number.isNaN(v)
    ? "—"
    : typeof v === "number"
    ? v.toFixed(2)
    : String(v);

const TableView: React.FC<{ title?: string; rows: any[] }> = ({ title, rows }) => {
  if (!rows || rows.length === 0) return null;
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  return (
    <div className="card glass holo-border">
      {title && <h3 className="card-title">{title}</h3>}
      <div className="table-wrap">
        <table className="nebula-table">
          <thead>
            <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {headers.map((h) => (
                  <td key={h}>{numberFmt((r as any)[h])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ResultsPanel: React.FC<ResultsPanelProps> = ({ outputs }) => {
  if (!outputs || outputs.length === 0) {
    return <div className="results-placeholder muted">Analysis workspace goes here…</div>;
  }

  return (
    <>
      {outputs.map((o, i) => {
        if (o.type === "table") {
          return <TableView key={i} title={o.title} rows={o.data?.rows || []} />;
        }
        if (o.type === "text") {
          return (
            <div className="card glass holo-border" key={i}>
              {o.title && <h3 className="card-title">{o.title}</h3>}
              <pre className="small-note">{o.data?.markdown ?? ""}</pre>
            </div>
          );
        }
        // Chart types can be added later
        return null;
      })}
    </>
  );
};

export default ResultsPanel;
