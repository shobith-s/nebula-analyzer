import React from "react";
import {
  LineChart, Line,
  BarChart, Bar,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

type HeatmapSpec = { kind: "heatmap"; z: number[][]; x: string[]; y: string[]; };
type BarSpec     = { kind: "bar";     x: string[];  y: number[]; };
type HistSpec    = { kind: "hist";    bins: number[]; counts: number[]; label?: string; };
type ScatterSpec = { kind: "scatter"; x: number[];   y: number[]; xLabel?: string; yLabel?: string; };

type ChartSpec = HeatmapSpec | BarSpec | HistSpec | ScatterSpec;

interface DataChartProps {
  data?: number[][];
  headers?: string[];
  xAxisKey?: string;
  yAxisKey?: string;
  spec?: ChartSpec;
  title?: string;
}

const DataChart: React.FC<DataChartProps> = ({ data, headers, xAxisKey, yAxisKey, spec, title }) => {
  // ---- SPEC MODE FIRST ----
  if (spec && spec.kind === "bar") {
    const { x, y } = spec;
    const barData = (x || []).map((label, i) => ({ category: label, value: y?.[i] ?? null }));
    return (
      <div className="chart-container">
        <h3>{title || "Bar Chart"}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" name="Value" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (spec && spec.kind === "hist") {
    const { bins, counts, label } = spec;
    const rows = bins.map((b, i) => ({ bin: b, count: counts[i] ?? 0 }));
    return (
      <div className="chart-container">
        <h3>{title || `Histogram${label ? ` (${label})` : ""}`}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="bin" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" name="Count" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (spec && spec.kind === "scatter") {
    const { x, y, xLabel, yLabel } = spec;
    const rows = (x || []).map((vx, i) => ({ x: vx, y: y?.[i] ?? null }));
    return (
      <div className="chart-container">
        <h3>{title || "Scatter"}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid />
            <XAxis dataKey="x" name={xLabel || "X"} />
            <YAxis dataKey="y" name={yLabel || "Y"} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={rows} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (spec && spec.kind === "heatmap") {
    const { z, x, y } = spec;
    const flat = (z || []).flat().filter(v => typeof v === "number" && !Number.isNaN(v));
    const min = flat.length ? Math.min(...flat) : 0;
    const max = flat.length ? Math.max(...flat) : 1;
    const range = max - min || 1;
    const norm = (v: number) => (v - min) / range;

    return (
      <div className="chart-container">
        <h3>{title || "Correlation Heatmap"}</h3>
        <div className="nebula-heatmap" style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr><th></th>{(x || []).map((cx, i) => <th key={i}>{cx}</th>)}</tr>
            </thead>
            <tbody>
              {(z || []).map((row, ri) => (
                <tr key={ri}>
                  <th>{y?.[ri] ?? ri}</th>
                  {row.map((v, ci) => {
                    const n = norm(typeof v === "number" ? v : 0);
                    const hue = 220;
                    const light = 95 - Math.round(n * 60);
                    const bg = `hsl(${hue}, 60%, ${light}%)`;
                    return <td key={ci} style={{ background: bg, textAlign: "center" }}>{typeof v === "number" ? v.toFixed(2) : String(v)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ---- Legacy numeric mode (unchanged) ----
  if (!data || data.length === 0 || (data[0]?.length ?? 0) < 2) {
    return <p>A chart requires at least 2 columns of data.</p>;
  }
  const headerIdx = (name?: string) => (name && headers ? Math.max(0, headers.indexOf(name)) : null);
  const xIdx = headerIdx(xAxisKey);
  const yIdx = headerIdx(yAxisKey);
  const xi = (xIdx !== null && xIdx >= 0) ? xIdx : 0;
  const yi = (yIdx !== null && yIdx >= 0) ? yIdx : 1;
  const chartData = data.map((row) => ({ x: row[xi], y: row[yi] }));
  const xLabel = (headers && headers[xi]) ? headers[xi] : "Column 1";
  const yLabel = (headers && headers[yi]) ? headers[yi] : "Column 2";

  return (
    <div className="chart-container">
      <h3>{title || `Data Visualization (${xLabel} vs ${yLabel})`}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" label={{ value: xLabel, position: "insideBottom", offset: -5 }} />
          <YAxis label={{ value: yLabel, angle: -90, position: "insideLeft" }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="y" activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
export default DataChart;
