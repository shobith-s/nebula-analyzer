export type PayloadType = 'text' | 'table' | 'chart' | 'metric';

export interface MessagePayload {
  type: PayloadType;
  title?: string;
  data: any;
}

export interface Message {
  sender: 'user' | 'ai';
  text?: string;
  payloads?: MessagePayload[];
}

export interface ColumnProfile {
  name: string;
  dtype: string;
  missing: number;
  outliers: number;
}

export interface ProfileSummary {
  filename: string;
  n_rows: number;
  n_cols: number;
  columns?: ColumnProfile[];
  quality_score?: number;
  missing_total?: number;
  duplicates_total?: number;
  suggestions?: string[];
  anomalies?: Record<string, any>;
}

/** Small slice of data sent to /analyze so backend can compute charts */
export interface TabularPreview {
  headers: string[];
  rows: (string | number | null)[][]; // trimmed rows, stringified by Papa.parse
}

export type ModelChoice = 'gemini' | 'local';
