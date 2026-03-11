export type SyncState = 'synced' | 'missing' | 'differs' | 'na';

export interface SecretSyncRow {
  name: string;
  vaultPreview: string;
  targets: Record<string, SyncState>;
}

export type SyncTarget = 'supabase' | 'vercel' | 'github';
