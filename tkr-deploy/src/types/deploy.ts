export interface DeployStep {
  id: string;
  label: string;
  provider: string;
  execute: () => Promise<void>;
}

export interface DeploySequence {
  steps: DeployStep[];
  onProgress?: (stepId: string, status: 'running' | 'done' | 'failed') => void;
}

export type DeployStepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

export interface DeployStepResult {
  stepId: string;
  status: DeployStepStatus;
  durationMs: number;
  error?: string;
}
