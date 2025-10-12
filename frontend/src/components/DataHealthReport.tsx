import React from "react";

/** Shape returned by /api/profile-data */
export type ProfileSummary = {
  filename: string;
  n_rows: number;
  n_cols: number;

  /** Optional, if backend provides extra stats */
  missing_values?: number;
  duplicate_rows?: number;
  quality_score?: number | null;

  /** Optional, if backend provides per-column info */
  columns?: Array<{
    name: string;
    dtype?: string;
    missing?: number;     // count
    outliers?: number;    // count
  }>;
};

interface Props {
  summary: ProfileSummary;
  onProceed: () => void;
}

const DataHealthReport: React.FC<Props> = ({ summary, onProceed }) => {
  const quality = summary.quality_score ?? null;

  return (
    <div className="data-health-report">
      <div className="dhr-header">
        <h2>
          Data Health Report for <span className="file-name">{summary.filename}</span>
        </h2>
      </div>

      <div className="profile-grid">
        {/* Left: column analysis (table) */}
        <div className="profile-left card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Column Name</th>
                  <th>Data Type</th>
                  <th>Missing</th>
                  <th>Outliers</th>
                </tr>
              </thead>
              <tbody>
                {(summary.columns ?? []).map((c) => (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    <td>{c.dtype ?? "—"}</td>
                    <td>{c.missing ?? 0}</td>
                    <td>{c.outliers ?? 0}</td>
                  </tr>
                ))}
                {(!summary.columns || summary.columns.length === 0) && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", opacity: 0.8 }}>
                      No per-column details were provided by the server.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: dataset stats */}
        <aside className="profile-right stats-card">
          <h3>Dataset Stats</h3>
          <table className="stats-table">
            <tbody>
              <tr>
                <td>Data Quality Score</td>
                <td className="num strong">
                  {quality === null ? "—" : `${Number(quality).toFixed(1)}%`}
                </td>
              </tr>
              <tr>
                <td>Total Rows</td>
                <td className="num">{summary.n_rows.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Total Columns</td>
                <td className="num">{summary.n_cols.toLocaleString()}</td>
              </tr>
              {"missing_values" in summary && (
                <tr>
                  <td>Missing Values</td>
                  <td className="num">{Number(summary.missing_values ?? 0).toLocaleString()}</td>
                </tr>
              )}
              {"duplicate_rows" in summary && (
                <tr>
                  <td>Duplicate Rows</td>
                  <td className="num">{Number(summary.duplicate_rows ?? 0).toLocaleString()}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="cleaning-plan">
            <h4>Suggested Cleaning Plan</h4>
            <ul>
              <li>Handle missing values appropriately (impute or drop).</li>
              <li>Remove duplicate rows if not intentional.</li>
              <li>Cast columns to correct data types.</li>
              <li>Check outliers for validity.</li>
            </ul>
          </div>
        </aside>
      </div>

      <div className="profile-footer">
        <div className="hint">Looks good? Continue to the analysis workspace.</div>
        <button className="analyze-button" onClick={onProceed}>
          Proceed to Analysis
        </button>
      </div>
    </div>
  );
};

export default DataHealthReport;
