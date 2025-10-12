// Shared app types

export type AIStatus = 'idle' | 'thinking' | 'success' | 'error';

export interface ProfileColumn {
  name: string;
  dtype: "numeric" | "categorical" | string;
  missing: number;
  missing_pct: number;
  outliers: number;
}

// Global app types that both frontend and (compat) backend agree on.

export type ColumnStat = {
  name: string;
  dtype?: string;
  // per-column quality signals (all optional – backend may omit)
  missing?: number;           // count of null/empty cells in this column
  duplicates?: number;        // duplicates in this column (if reported per-column)
  outliers?: number;          // outlier count flagged by profiler
  uniques?: number;           // distinct values
  min?: number;
  max?: number;
  mean?: number;
  std?: number;
};

export interface ProfileSummary {
  // generic flags the compat endpoint might return
  ok?: boolean;
  mode?: string;

  // required
  filename: string;
  n_rows: number;
  n_cols: number;

  // optional high-level quality stats
  quality_score?: number;     // 0..100, if computed by profiler
  missing_total?: number;     // total missing across dataset
  duplicates_total?: number;  // total duplicate rows across dataset

  // optional detailed section
  columns?: ColumnStat[];

  // optional cleaning suggestions
  suggestions?: string[];
}

export interface ResultBlock {
  id: string;
  title?: string;
  html?: string;
  table?: { columns: string[]; rows: (string | number | null)[][] };
  chart?: unknown;
}
