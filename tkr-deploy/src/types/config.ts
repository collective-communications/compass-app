export interface Config {
  port: number;
  vaultUrl: string;
  vaultName: string;
  supabase: {
    projectRef: string;
    dbPassword: string;
    accessToken: string;
  };
  vercel: {
    token: string;
    projectId: string;
    orgId: string;
  };
  resend: {
    apiKey: string;
  };
  github: {
    token: string;
    owner: string;
    repo: string;
  };
}

export const DEFAULT_CONFIG = {
  port: 42043,
  vaultUrl: 'http://localhost:42042',
  vaultName: 'tkr-secrets',
} as const;
