import React from "react";
import type { ProfileSummary } from "../types";

interface Props {
  summary: ProfileSummary;
  onProceed: () => void;
}

const fmt = (v: number | null | undefined, digits = 0) =>
  v === null || v === undefined ? "—" : v.toFixed(digits);

const DataHealthReport: React.FC<Props> = ({ summary, onProceed }) => {
  const cols = summary.columns ?? [];
  const suggestions =
    summary.suggestions ??
    [
      "Handle missing values appropriately (impute or drop).",
      "Remove duplicate rows if not intentional.",
      "Cast columns to correct data types.",
      "Check outliers for validity.",
    ];

  return (
    <div className="data-health-report">
      <h2 className="section-title">
        Data Health Report for <span className="file-name">{summary.filename}</span>
      </h2>

      <div className="profile-grid">
        {/* left: table */}
        <div className="profile-left">
          <div className="table-container card">
            <table className="nebula-table">
              <thead>
                <tr>
                  <th>Column Name</th>
                  <th>Data Type</th>
                  <th>Missing</th>
                  <th>Outliers</th>
                  <th>Duplicates</th>
                </tr>
              </thead>
              <tbody>
                {cols.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      No per-column details were provided by the server.
                    </td>
                  </tr>
                ) : (
                  cols.map((c) => (
                    <tr key={c.name}>
                      <td>{c.name}</td>
                      <td>{c.dtype}</td>
                      <td>
                        {c.missing} ({fmt(c.missing_pct, 1)}%)
                      </td>
                      <td>{c.outliers}</td>
                      <td>{c.duplicates ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* right: stats */}
        <aside className="profile-right">
          <div className="stats-card">
            <h3>Dataset Stats</h3>
            <table className="stats-table">
              <tbody>
                <tr>
                  <td>Data Quality Score</td>
                  <td className="num strong">
                    {summary.quality_score === null || summary.quality_score === undefined
                      ? "—"
                      : `${fmt(summary.quality_score, 1)}%`}
                  </td>
                </tr>
                <tr>
                  <td>Total Rows</td>
                  <td className="num">{summary.n_rows.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Total Columns</td>
                  <td className="num">{summary.n_cols}</td>
                </tr>
                {summary.missing_total !== undefined && (
                  <tr>
                    <td>Missing Values</td>
                    <td className="num">{summary.missing_total.toLocaleString()}</td>
                  </tr>
                )}
                {summary.duplicates_total !== undefined && (
                  <tr>
                    <td>Duplicate Rows</td>
                    <td className="num">{summary.duplicates_total.toLocaleString()}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="cleaning-plan">
            <h4>Suggested Cleaning Plan</h4>
            <ul>
              {suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
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
