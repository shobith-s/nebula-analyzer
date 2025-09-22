// In frontend/src/components/DataTable.tsx
import React from 'react';

interface DataTableProps {
  data: number[][];
  headers: string[]; // Now accepts headers
}

const DataTable: React.FC<DataTableProps> = ({ data, headers }) => {
  if (!data || data.length === 0) {
    return <p>No data to display.</p>;
  }

  return (
    <div className="table-container">
      <h3>Uploaded Data</h3>
      <table>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;