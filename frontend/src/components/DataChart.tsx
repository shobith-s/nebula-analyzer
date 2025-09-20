// In frontend/src/components/DataChart.tsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DataChartProps {
  data: number[][];
}

const DataChart: React.FC<DataChartProps> = ({ data }) => {
  if (!data || data.length === 0 || data[0].length < 2) {
    return <p>A chart requires at least 2 columns of data.</p>;
  }

  const chartData = data.map(row => ({
    col1: row[0],
    col2: row[1],
  }));

  return (
    <div className="chart-container">
        <h3>Data Visualization (First 2 Columns)</h3>
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
                {/* Add a glow filter definition */}
                <defs>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                <XAxis dataKey="col1" stroke="#888" label={{ value: 'Column 1', position: 'insideBottom', offset: -5 }}/>
                <YAxis stroke="#888" label={{ value: 'Column 2', angle: -90, position: 'insideLeft' }}/>
                <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2d3748' }}
                    labelStyle={{ color: 'var(--stellar-white)' }}
                />
                <Legend />
                <Line 
                    type="monotone" 
                    dataKey="col2" 
                    stroke="var(--nebula-purple)" 
                    strokeWidth={2}
                    activeDot={{ r: 8 }} 
                    dot={{ r: 4, fill: 'var(--nebula-purple)' }}
                    filter="url(#glow)"
                />
            </LineChart>
        </ResponsiveContainer>
    </div>
  );
};

export default DataChart;