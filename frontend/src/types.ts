// Shared app types

export type AIStatus = 'idle' | 'thinking' | 'success' | 'error';
// Shared app types

export interface ColumnStat {
  name: string;
  dtype: string;
  missing: number;       // count
  missing_pct: number;   // 0..100
  outliers: number;      // count
  duplicates?: number;   // optional
}

export interface ProfileSummary {
  filename: string;
  n_rows: number;
  n_cols: number;
  quality_score?: number | null;       // 0..100
  columns?: ColumnStat[];              // per-column profile
  missing_total?: number;              // count
  duplicates_total?: number;           // count
  suggestions?: string[];              // cleaning plan bullets
}

// (Optional) result/output shape used by ResultsPanel.
// Keep it loose for now to unblock the UI; refine later.
export interface ResultBlock {
  id: string;
  title?: string;
  html?: string;
  table?: { columns: string[]; rows: (string | number | null)[][] };
  chart?: unknown;
}
