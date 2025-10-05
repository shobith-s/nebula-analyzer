import React from 'react';

type Output = {
  type: 'text' | 'table' | 'chart';
  title?: string;
  data?: any;
};

interface ResultsPanelProps {
  outputs: Output[];
}

const numberFmt = (v: any) =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : (typeof v === 'number' ? v.toFixed(2) : String(v));

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
                {headers.map((h) => <td key={h}>{numberFmt(r[h])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Heatmap: React.FC<{ title?: string; x: string[]; y: string[]; z: (number|null)[][]; note?: string }> = ({ title, x, y, z, note }) => {
  // simple diverging color: blue (-1) -> gray (0) -> red (1)
  const colorFor = (v: number|null) => {
    if (v === null || Number.isNaN(v)) return 'rgba(255,255,255,0.06)';
    const t = Math.max(-1, Math.min(1, v));
    const a = Math.abs(t);
    const hue = t >= 0 ? 8 : 210; // red-ish vs blue-ish
    const sat = 70;
    const light = 18 + 30 * (1 - a); // stronger value = darker
    return `hsl(${hue} ${sat}% ${light}%)`;
  };

  return (
    <div className="card">
      {title && <h3 className="card-title">{title}</h3>}
      <div className="heatmap-wrap">
        <div className="heatmap-grid" style={{ gridTemplateColumns: `120px repeat(${x.length}, 1fr)` }}>
          {/* corner */}
          <div className="heatmap-corner" />
          {/* x headers */}
          {x.map((hx) => <div key={`hx-${hx}`} className="heatmap-hx">{hx}</div>)}
          {/* rows */}
          {y.map((hy, row) => (
            <React.Fragment key={`row-${hy}`}>
              <div className="heatmap-hy">{hy}</div>
              {x.map((_, col) => {
                const v = z?.[row]?.[col] ?? null;
                return (
                  <div
                    key={`cell-${row}-${col}`}
                    className="heatmap-cell"
                    title={v === null ? 'n/a' : String(v)}
                    style={{ background: colorFor(v as any) }}
                  >
                    <span>{v === null ? '' : numberFmt(v)}</span>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
        {note && <div className="heatmap-note">{note}</div>}
      </div>
    </div>
  );
};

const ResultsPanel: React.FC<ResultsPanelProps> = ({ outputs }) => {
  if (!outputs || outputs.length === 0) return null;

  return (
    <>
      {outputs.map((o, i) => {
        if (o.type === 'chart' && o.data?.kind === 'heatmap') {
          return <Heatmap key={i} title={o.title} x={o.data.x} y={o.data.y} z={o.data.z} note={o.data.note} />;
        }
        if (o.type === 'table') {
          return <TableView key={i} title={o.title} rows={o.data?.rows || []} />;
        }
        // skip Insight text (shown in console already). Render other texts as small notes.
        if (o.type === 'text' && o.title !== 'Insight') {
          return (
            <div className="card" key={i}>
              {o.title && <h3 className="card-title">{o.title}</h3>}
              <pre className="small-note">{o.data?.markdown ?? ''}</pre>
            </div>
          );
        }
        return null;
      })}
    </>
  );
};

export default ResultsPanel;
