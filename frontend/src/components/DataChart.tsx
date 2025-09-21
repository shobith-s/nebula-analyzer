// In frontend/src/components/DataChart.tsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DataChartProps {
  data: number[][];
  headers: string[];
  xAxisKey: string;
  yAxisKey: string;
}

const DataChart: React.FC<DataChartProps> = ({ data, headers, xAxisKey, yAxisKey }) => {
  if (!data || data.length === 0 || !xAxisKey || !yAxisKey) {
    return <p>Please select columns for both X and Y axes to display the chart.</p>;
  }

  // Get the index of the selected headers
  const xIndex = headers.indexOf(xAxisKey);
  const yIndex = headers.indexOf(yAxisKey);

  if (xIndex === -1 || yIndex === -1) {
    return <p>Invalid column selection.</p>;
  }

  // Format the data for Recharts using the dynamic keys
  const chartData = data.map(row => ({
    [xAxisKey]: row[xIndex],
    [yAxisKey]: row[yIndex],
  }));

  return (
    <div className="chart-container">
        <h3>Data Visualization</h3>
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
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
                <XAxis dataKey={xAxisKey} stroke="#888" label={{ value: xAxisKey, position: 'insideBottom', offset: -5 }}/>
                <YAxis stroke="#888" label={{ value: yAxisKey, angle: -90, position: 'insideLeft' }}/>
                <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2d3748' }}
                    labelStyle={{ color: 'var(--stellar-white)' }}
                />
                <Legend />
                <Line 
                    type="monotone" 
                    dataKey={yAxisKey} 
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