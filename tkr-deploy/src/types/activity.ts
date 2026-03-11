export interface ActivityLogEntry {
  timestamp: string;
  action: string;
  provider: string;
  status: 'success' | 'skipped' | 'failed';
  durationMs?: number;
  error?: string;
}
