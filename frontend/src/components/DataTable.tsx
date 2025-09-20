import React from 'react';

interface DataTableProps {
  data: number[][];
}

const DataTable: React.FC<DataTableProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <p>No data to display.</p>;
  }

  return (
    <div className="table-container">
      <h3>Uploaded Data</h3>
      <table>
        <thead>
          <tr>
            {data[0].map((_, index) => (
              <th key={index}>Column {index + 1}</th>
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