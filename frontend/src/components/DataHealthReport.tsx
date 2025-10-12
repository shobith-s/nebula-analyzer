import React from "react";
import type { ProfileSummary } from "../types";

/**
 * Shows ONLY anomalies + high-level stats.
 * Optional fields are guarded so partial summaries are safe.
 */
type Props = {
  summary: ProfileSummary;
  onProceed: () => void;
};

const num = (v: number | null | undefined, digits = 0) =>
  v === null || v === undefined || Number.isNaN(v) ? "—" : v.toLocaleString(undefined, { maximumFractionDigits: digits });

const DataHealthReport: React.FC<Props> = ({ summary, onProceed }) => {
  const cols = summary.columns ?? []; // columns?: Array<{ name, dtype, missing, outliers }>
  const totalRows = summary.n_rows ?? 0;
  const totalCols = summary.n_cols ?? cols.length;

  const quality = summary.quality_score; // number | undefined
  const missingTotal = summary.missing_total ?? undefined;
  const dupTotal = summary.duplicates_total ?? undefined;

  const suggestions: string[] =
    summary.suggestions && summary.suggestions.length > 0
      ? summary.suggestions
      : [
          "Handle missing values appropriately (impute or drop).",
          "Remove duplicate rows if not intentional.",
          "Cast columns to correct data types.",
          "Check outliers for validity.",
        ];

  return (
    <div className="profile-wrap">
      <h2 className="h2">
        Data Health Report for <span className="file-pill">{summary.filename ?? "dataset.csv"}</span>
      </h2>

      <div className="profile-grid">
        {/* Left: per-column anomalies only */}
        <div className="card glass holo-border">
          <div className="table-wrap">
            <table className="nebula-table compact">
              <thead>
                <tr>
                  <th>Column Name</th>
                  <th>Data Type</th>
                  <th>Missing</th>
                  <th>Outliers</th>
                </tr>
              </thead>
              <tbody>
                {cols.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      No per-column details were provided by the server.
                    </td>
                  </tr>
                ) : (
                  cols.map((c, i) => (
                    <tr key={`${c.name}-${i}`}>
                      <td>{c.name}</td>
                      <td className="muted">{c.dtype ?? "—"}</td>
                      <td className={c.missing && c.missing > 0 ? "warn" : ""}>
                        {num(c.missing)}
                      </td>
                      <td className={c.outliers && c.outliers > 0 ? "warn" : ""}>
                        {num(c.outliers)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: dataset stats + suggestions */}
        <div className="side-stack">
          <div className="card glass holo-border">
            <h3 className="card-title">Dataset Stats</h3>
            <ul className="kv-list">
              <li>
                <span>Data Quality Score</span>
                <strong className="num">{quality === undefined ? "—" : quality.toFixed(1)}</strong>
              </li>
              <li>
                <span>Total Rows</span>
                <strong className="num">{num(totalRows)}</strong>
              </li>
              <li>
                <span>Total Columns</span>
                <strong className="num">{num(totalCols)}</strong>
              </li>
              {missingTotal !== undefined && (
                <li>
                  <span>Missing Values</span>
                  <strong className={`num ${missingTotal > 0 ? "warn" : ""}`}>{num(missingTotal)}</strong>
                </li>
              )}
              {dupTotal !== undefined && (
                <li>
                  <span>Duplicate Rows</span>
                  <strong className={`num ${dupTotal > 0 ? "warn" : ""}`}>{num(dupTotal)}</strong>
                </li>
              )}
            </ul>
          </div>

          <div className="card glass holo-border">
            <h3 className="card-title">Suggested Cleaning Plan</h3>
            <ul className="bullet-list">
              {suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>

          <div className="card glass holo-border">
            <div className="actions-row">
              <span className="muted">Looks good? Continue to the analysis workspace.</span>
              <button onClick={onProceed} className="btn-primary">
                Proceed to Analysis
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataHealthReport;
