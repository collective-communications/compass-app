export type ProviderStatus = 'healthy' | 'warning' | 'down' | 'unknown';

export interface ProviderHealth {
  provider: string;
  status: ProviderStatus;
  label: string;
  details: Record<string, unknown>;
  checkedAt: number;
}

export interface ProviderAdapter {
  readonly name: string;
  healthCheck(): Promise<ProviderHealth>;
}
