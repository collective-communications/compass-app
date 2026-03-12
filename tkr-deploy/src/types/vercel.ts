export interface DeploymentEntry {
  uid: string;
  commitSha: string;
  commitMessage: string;
  branch: string;
  target: 'production' | 'preview';
  status: string;
  duration: number | null;
  createdAt: string;
  url?: string;
  errorMessage?: string;
  inspectorUrl?: string;
}

export interface VercelProject {
  name: string;
  framework: string | null;
  productionUrl: string | null;
}

export interface VercelEnvVar {
  key: string;
  value: string;
  target: string[];
  type: string;
  id: string;
}
