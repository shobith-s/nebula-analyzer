export type AIStatus = 'idle' | 'thinking' | 'success' | 'error';

export type PayloadType = 'text' | 'table' | 'chart' | 'metric';

export interface MessagePayload {
  type: PayloadType;
  title: string;
  // For chart: { kind:'bar'|'heatmap', ... }
  // For table: { rows: Array<Record<string, any>> }
  // For text:  { markdown: string }
  // For metric: Record<string, number | string>
  data: any;
}

export interface Message {
  sender: 'user' | 'ai';
  text?: string;                     // legacy: plain text bubble
  payloads?: MessagePayload[];       // new: structured blocks from /chat
}

export interface ImportanceData {
  name: string;
  importance: number;
}
