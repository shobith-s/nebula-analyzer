// In frontend/src/components/DataHealthReport.tsx
import React from 'react';
import { motion } from 'framer-motion';

// Define the structure of the report data we expect from the backend
interface ColumnProfile {
  column_name: string;
  data_type: string;
  missing_values: number;
  missing_percentage: number;
  outlier_count: number;
}
interface Report {
  general_stats: {
    total_rows: number;
    duplicate_rows: number;
  };
  column_profiles: ColumnProfile[];
}

interface DataHealthReportProps {
  report: Report | null;
  fileName: string;
  onProceed: () => void; // A function to call when the user clicks "Analyze"
}

const DataHealthReport: React.FC<DataHealthReportProps> = ({ report, fileName, onProceed }) => {
  if (!report) {
    return <p>Generating data health report...</p>;
  }

  const { general_stats, column_profiles } = report;

  // Calculate an overall data quality score
  const total_cells = general_stats.total_rows * column_profiles.length;
  const total_missing = column_profiles.reduce((sum, col) => sum + col.missing_values, 0);
  const quality_score = total_cells > 0 ? ((total_cells - total_missing) / total_cells) * 100 : 100;

  return (
    <motion.div 
      className="data-health-report"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2>Data Health Report for <span className="file-name">{fileName}</span></h2>
      
      <div className="summary-cards">
        <div className="summary-card">
          <h3>Data Quality Score</h3>
          <p className="score">{quality_score.toFixed(1)}%</p>
        </div>
        <div className="summary-card">
          <h3>Total Rows</h3>
          <p>{general_stats.total_rows}</p>
        </div>
        <div className="summary-card">
          <h3>Duplicate Rows</h3>
          <p className="warning">{general_stats.duplicate_rows}</p>
        </div>
      </div>

      <h3>Column Analysis</h3>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Column Name</th>
              <th>Data Type</th>
              <th>Missing Values</th>
              <th>Outliers Detected</th>
            </tr>
          </thead>
          <tbody>
            {column_profiles.map((col) => (
              <tr key={col.column_name}>
                <td>{col.column_name}</td>
                <td>{col.data_type}</td>
                <td className={col.missing_values > 0 ? 'warning' : ''}>
                  {col.missing_values} ({col.missing_percentage.toFixed(1)}%)
                </td>
                <td className={col.outlier_count > 0 ? 'warning' : ''}>
                  {col.outlier_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cleaning-plan">
        <h3>Suggested Cleaning Plan</h3>
        <ul>
          <li><input type="checkbox" defaultChecked /> Remove {general_stats.duplicate_rows} duplicate rows.</li>
          <li><input type="checkbox" defaultChecked /> Fill missing numerical values with the column average (median).</li>
          <li><input type="checkbox" disabled /> Outliers will be flagged for your attention during analysis.</li>
        </ul>
      </div>
      
      <button className="analyze-button" onClick={onProceed}>
        Clean and Proceed to Analysis
      </button>
    </motion.div>
  );
};

export default DataHealthReport;