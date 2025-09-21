// In frontend/src/types.ts

export type AIStatus = 'idle' | 'thinking' | 'success' | 'error';

export interface Message {
  sender: 'user' | 'ai';
  text: string;
}

export interface ImportanceData {
  name: string;
  importance: number;
}