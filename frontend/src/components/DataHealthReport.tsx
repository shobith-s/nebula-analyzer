import React, { useMemo, useState } from 'react';

export interface CleaningChoices {
  removeDuplicates: boolean;
  fillMissing: boolean;
}

interface ColumnProfile {
  column_name: string;
  data_type: string;
  missing_values: number;
  missing_percentage: number;
  outlier_count: number;
}
interface HealthReport {
  general_stats: { total_rows: number; duplicate_rows: number };
  column_profiles: ColumnProfile[];
}

interface Props {
  report: HealthReport | null;
  fileName: string;
  onProceed: (choices: CleaningChoices) => void;
}

const DataHealthReport: React.FC<Props> = ({ report, fileName, onProceed }) => {
  const [choices, setChoices] = useState<CleaningChoices>({
    removeDuplicates: true,
    fillMissing: true,
  });

  const metrics = useMemo(() => {
    const rows = report?.general_stats.total_rows ?? 0;
    const dups = report?.general_stats.duplicate_rows ?? 0;
    const cols = report?.column_profiles?.length ?? 0;
    const missing =
      report?.column_profiles?.reduce((s, c) => s + (c.missing_values || 0), 0) ?? 0;

    const cells = Math.max(rows * cols, 1);
    const missPct = cells ? (missing / cells) * 100 : 0;
    const dupPct = rows ? (dups / rows) * 100 : 0;

    let score = 100 - (missPct * 0.8 + dupPct * 0.2);
    if (!isFinite(score)) score = 0;
    score = Math.max(0, Math.min(100, score));

    return { rows, cols, dups, missing, missPct, dupPct, score };
  }, [report]);

  if (!report) return <div>No profile available.</div>;

  return (
    <section className="data-health-report">
      <h2>
        Data Health Report for <span className="file-name">{fileName || 'your file'}</span>
      </h2>

      {/* Two-column layout (safe widths) */}
      <div className="profile-grid">
        {/* LEFT: Column analysis table */}
        <div className="profile-left">
          <h3>Column Analysis</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Column Name</th>
                  <th style={{ textAlign: 'left' }}>Data Type</th>
                  <th>Missing Values</th>
                  <th>Outliers Detected</th>
                </tr>
              </thead>
              <tbody>
                {report.column_profiles.map((c) => (
                  <tr key={c.column_name}>
                    <td style={{ textAlign: 'left' }}>{c.column_name}</td>
                    <td style={{ textAlign: 'left' }}>{c.data_type}</td>
                    <td>
                      {c.missing_values} ({c.missing_percentage.toFixed(1)}%)
                    </td>
                    <td>{c.outlier_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: compact stats + cleaning plan */}
        <div className="profile-right">
          <div className="stats-card">
            <h3>Dataset Stats</h3>
            <div className="stats-table-wrap">
              <table className="stats-table">
                <tbody>
                  <tr><td>Data Quality Score</td><td className="num strong">{metrics.score.toFixed(1)}%</td></tr>
                  <tr><td>Total Rows</td><td className="num">{metrics.rows.toLocaleString()}</td></tr>
                  <tr><td>Total Columns</td><td className="num">{metrics.cols}</td></tr>
                  <tr><td>Missing Values</td><td className="num">{metrics.missing.toLocaleString()} ({metrics.missPct.toFixed(1)}%)</td></tr>
                  <tr><td>Duplicate Rows</td><td className="num">{metrics.dups.toLocaleString()} ({metrics.dupPct.toFixed(1)}%)</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="cleaning-plan">
            <h3>Suggested Cleaning Plan</h3>
            <ul>
              <li>
                <label>
                  <input
                    type="checkbox"
                    checked={choices.removeDuplicates}
                    onChange={(e) =>
                      setChoices((s) => ({ ...s, removeDuplicates: e.target.checked }))
                    }
                  />
                  {' '}Remove {metrics.dups} duplicate row{metrics.dups === 1 ? '' : 's'}.
                </label>
              </li>
              <li>
                <label>
                  <input
                    type="checkbox"
                    checked={choices.fillMissing}
                    onChange={(e) =>
                      setChoices((s) => ({ ...s, fillMissing: e.target.checked }))
                    }
                  />
                  {' '}Fill {metrics.missing} missing value{metrics.missing === 1 ? '' : 's'} (median for numeric).
                </label>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Sticky bottom footer (inside scroll area) */}
      <div className="profile-footer">
        <div className="profile-footer-left">
          <span className="hint">Ready when you are.</span>
        </div>
        <div className="profile-footer-right">
          <button className="analyze-button" onClick={() => onProceed(choices)}>
            Proceed to Analysis
          </button>
        </div>
      </div>
    </section>
  );
};

export default DataHealthReport;
