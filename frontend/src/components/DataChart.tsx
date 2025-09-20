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

  // Format the data for Recharts: an array of objects
  const chartData = data.map(row => ({
    col1: row[0],
    col2: row[1],
  }));

  return (
    <div className="chart-container">
        <h3>Data Visualization (First 2 Columns)</h3>
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="col1" label={{ value: 'Column 1', position: 'insideBottom', offset: -5 }}/>
                <YAxis label={{ value: 'Column 2', angle: -90, position: 'insideLeft' }}/>
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="col2" stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>
        </ResponsiveContainer>
    </div>
  );
};

export default DataChart;