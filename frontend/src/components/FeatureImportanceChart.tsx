import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { type ImportanceData, type MessagePayload } from '../types';

interface FeatureImportanceChartProps {
  /** Legacy mode (your current usage) */
  data?: ImportanceData[];
  /** NEW: direct /chat payload support (either chart spec or table rows) */
  payload?: MessagePayload; // expects type === 'chart' (bar) or type === 'table'
  title?: string;
}

const FeatureImportanceChart: React.FC<FeatureImportanceChartProps> = ({ data, payload, title }) => {
  // Normalize input into [{ name, importance }]
  let rows: ImportanceData[] = [];

  if (payload) {
    if (payload.type === 'chart' && payload.data?.kind === 'bar') {
      const xs: string[] = payload.data.x || [];
      const ys: number[] = payload.data.y || [];
      rows = xs.map((name, i) => ({ name, importance: Number(ys[i] ?? 0) }));
    } else if (payload.type === 'table' && Array.isArray(payload.data?.rows)) {
      rows = payload.data.rows.map((r: any) => ({
        name: String(r.feature ?? r.name ?? ''),
        importance: Number(r.importance ?? r.value ?? r.score ?? 0),
      }));
    }
  } else if (Array.isArray(data)) {
    rows = data;
  }

  if (!rows.length) {
    return <div className="chart-container"><h3>{title || 'Feature Importance (XAI)'}</h3><p>No feature importance data.</p></div>;
  }

  // Sort descending for nicer visuals
  rows = [...rows].sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0));

  return (
    <div className="chart-container">
      <h3>{title || 'Feature Importance (XAI)'}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="auroraGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--aurora-green)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="var(--aurora-green)" stopOpacity={0.2}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
          <XAxis type="number" stroke="#888" />
          <YAxis type="category" dataKey="name" width={100} stroke="#888" />
          <Tooltip
            cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2d3748' }}
            labelStyle={{ color: 'var(--stellar-white)' }}
          />
          <Legend />
          <Bar dataKey="importance" name="Importance" fill="url(#auroraGradient)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FeatureImportanceChart;
