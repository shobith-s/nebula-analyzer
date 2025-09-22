import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { type ImportanceData } from '../types';

interface FeatureImportanceChartProps {
  data: ImportanceData[];
}

const FeatureImportanceChart: React.FC<FeatureImportanceChartProps> = ({ data }) => {
  return (
    <div className="chart-container">
      <h3>Feature Importance (XAI)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="auroraGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--aurora-green)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="var(--aurora-green)" stopOpacity={0.2}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
          <XAxis type="number" stroke="#888" />
          <YAxis type="category" dataKey="name" width={80} stroke="#888" />
          <Tooltip 
            cursor={{fill: 'rgba(255, 255, 255, 0.1)'}}
            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2d3748' }}
            labelStyle={{ color: 'var(--stellar-white)' }}
          />
          <Legend />
          <Bar dataKey="importance" fill="url(#auroraGradient)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FeatureImportanceChart;