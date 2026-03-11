export interface WorkflowStatus {
  id: number;
  name: string;
  filename: string;
  state: 'active' | 'not_created';
  lastRun: WorkflowRun | null;
}

export interface WorkflowRun {
  id: number;
  status: string;
  conclusion: string | null;
  event: string;
  branch: string;
  durationMs: number | null;
  createdAt: string;
}

export interface RepoSecret {
  name: string;
  configured: boolean;
}

export const REQUIRED_SECRETS = [
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'SUPABASE_PROJECT_REF',
  'VERCEL_TOKEN',
  'VERCEL_ORG_ID',
  'VERCEL_PROJECT_ID',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'E2E_SUPABASE_SERVICE_KEY',
] as const;

export const KNOWN_WORKFLOWS = ['ci.yml', 'deploy.yml', 'supabase-keepalive.yml'] as const;
