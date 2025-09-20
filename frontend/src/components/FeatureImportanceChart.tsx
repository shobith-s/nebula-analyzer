// In frontend/src/components/FeatureImportanceChart.tsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ImportanceData {
  name: string;
  importance: number;
}

interface FeatureImportanceChartProps {
  data: ImportanceData[];
}

const FeatureImportanceChart: React.FC<FeatureImportanceChartProps> = ({ data }) => {
  return (
    <div className="chart-container">
      <h3>Feature Importance (XAI)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" width={80} />
          <Tooltip />
          <Legend />
          <Bar dataKey="importance" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FeatureImportanceChart;