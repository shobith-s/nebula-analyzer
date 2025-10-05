import React from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

type HeatmapSpec = {
  kind: 'heatmap';
  z: number[][];
  x: string[];  // column labels
  y: string[];  // row labels
};

type BarSpec = {
  kind: 'bar';
  x: string[];  // category labels
  y: number[];  // values
};

type ChartSpec = HeatmapSpec | BarSpec;

interface DataChartProps {
  /** Legacy numeric data mode */
  data?: number[][];
  headers?: string[];
  xAxisKey?: string;
  yAxisKey?: string;

  /** New spec mode from /chat payloads */
  spec?: ChartSpec;

  /** Optional title */
  title?: string;
}

const DataChart: React.FC<DataChartProps> = ({ data, headers, xAxisKey, yAxisKey, spec, title }) => {
  // ---------- Mode B: SPEC from /chat ----------
  if (spec && spec.kind === 'bar') {
    const { x, y } = spec;
    const barData = (x || []).map((label, i) => ({ category: label, value: y?.[i] ?? null }));

    return (
      <div className="chart-container">
        <h3>{title || 'Bar Chart'}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" name="Value" /* default color */ />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (spec && spec.kind === 'heatmap') {
    const { z, x, y } = spec;

    // Helper to shade cells based on value range
    const flat = (z || []).flat().filter(v => typeof v === 'number' && !Number.isNaN(v));
    const min = flat.length ? Math.min(...flat) : 0;
    const max = flat.length ? Math.max(...flat) : 1;
    const range = max - min || 1;
    const norm = (v: number) => (v - min) / range;

    return (
      <div className="chart-container">
        <h3>{title || 'Correlation Heatmap'}</h3>
        <div className="nebula-heatmap" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th></th>
                {(x || []).map((cx, i) => <th key={i}>{cx}</th>)}
              </tr>
            </thead>
            <tbody>
              {(z || []).map((row, ri) => (
                <tr key={ri}>
                  <th>{y?.[ri] ?? ri}</th>
                  {row.map((v, ci) => {
                    const n = norm(typeof v === 'number' ? v : 0);
                    const hue = 220; // keep a single hue; lightness varies
                    const light = 95 - Math.round(n * 60); // lighter for low, darker for high
                    const bg = `hsl(${hue}, 60%, ${light}%)`;
                    return (
                      <td key={ci} style={{ background: bg, textAlign: 'center' }}>
                        {typeof v === 'number' ? v.toFixed(2) : String(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ---------- Mode A: Legacy numeric matrix ----------
  if (!data || data.length === 0 || (data[0]?.length ?? 0) < 2) {
    return <p>A chart requires at least 2 columns of data.</p>;
  }

  // Derive indices for X/Y
  const headerIdx = (name?: string) =>
    name && headers ? Math.max(0, headers.indexOf(name)) : null;

  const xIdx = headerIdx(xAxisKey);
  const yIdx = headerIdx(yAxisKey);

  const xi = (xIdx !== null && xIdx >= 0) ? xIdx : 0;
  const yi = (yIdx !== null && yIdx >= 0) ? yIdx : 1;

  // Format data for Recharts
  const chartData = data.map((row) => ({
    x: row[xi],
    y: row[yi],
  }));

  const xLabel = (headers && headers[xi]) ? headers[xi] : 'Column 1';
  const yLabel = (headers && headers[yi]) ? headers[yi] : 'Column 2';

  return (
    <div className="chart-container">
      <h3>{title || `Data Visualization (${xLabel} vs ${yLabel})`}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" label={{ value: xLabel, position: 'insideBottom', offset: -5 }}/>
          <YAxis label={{ value: yLabel, angle: -90, position: 'insideLeft' }}/>
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="y" /* default color */ activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DataChart;
