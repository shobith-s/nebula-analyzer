import React from "react";

export type Output = {
  type: "text" | "table" | "chart";
  title?: string;
  data?: any;
};

interface ResultsPanelProps {
  outputs: Output[];
}

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
    <div className="card">
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
                  <td key={h}>{numberFmt(r[h])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// placeholder for future charts (kept simple to avoid inline styles)
const Heatmap: React.FC<{
  title?: string;
  x: string[];
  y: string[];
  z: (number | null)[][];
  note?: string;
}> = ({ title, x, y, z, note }) => {
  const colorFor = (v: number | null) => {
    if (v === null || Number.isNaN(v)) return "var(--heat-nodata)";
    const t = Math.max(-1, Math.min(1, v));
    return t >= 0 ? `var(--heat-pos)` : `var(--heat-neg)`;
  };

  return (
    <div className="card">
      {title && <h3 className="card-title">{title}</h3>}
      <div className="heatmap">
        <div className="heat-grid" style={{ gridTemplateColumns: `120px repeat(${x.length}, 1fr)` } as React.CSSProperties}>
          <div className="heat-corner" />
          {x.map((hx) => (
            <div key={`hx-${hx}`} className="heat-hx">
              {hx}
            </div>
          ))}
          {y.map((hy, row) => (
            <React.Fragment key={`row-${hy}`}>
              <div className="heat-hy">{hy}</div>
              {x.map((_, col) => {
                const v = z?.[row]?.[col] ?? null;
                return (
                  <div key={`cell-${row}-${col}`} className="heat-cell" title={v === null ? "n/a" : String(v)}>
                    <div className="heat-fill" style={{ background: colorFor(v) } as React.CSSProperties} />
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
        {note && <div className="heat-note">{note}</div>}
      </div>
    </div>
  );
};

const ResultsPanel: React.FC<ResultsPanelProps> = ({ outputs }) => {
  if (!outputs || outputs.length === 0)
    return <div className="results-placeholder">Analysis workspace goes here…</div>;

  return (
    <>
      {outputs.map((o, i) => {
        if (o.type === "chart" && o.data?.kind === "heatmap") {
          return (
            <Heatmap key={i} title={o.title} x={o.data.x} y={o.data.y} z={o.data.z} note={o.data.note} />
          );
        }
        if (o.type === "table") {
          return <TableView key={i} title={o.title} rows={o.data?.rows || []} />;
        }
        if (o.type === "text" && o.title !== "Insight") {
          return (
            <div className="card" key={i}>
              {o.title && <h3 className="card-title">{o.title}</h3>}
              <pre className="small-note">{o.data?.markdown ?? ""}</pre>
            </div>
          );
        }
        if (o.type === "text") {
          return (
            <div className="card" key={i}>
              <pre className="small-note">{o.data?.markdown ?? ""}</pre>
            </div>
          );
        }
        return null;
      })}
    </>
  );
};

export default ResultsPanel;
export type { ResultsPanelProps };
