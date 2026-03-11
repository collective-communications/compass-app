export interface VaultStatus {
  connected: boolean;
  locked: boolean;
  name: string;
  secretCount: number;
}

export interface VaultClient {
  health(): Promise<{ connected: boolean; locked: boolean; name: string }>;
  listSecrets(): Promise<string[]>;
  getSecret(name: string): Promise<string>;
  getAll(): Promise<Map<string, string>>;
  getStatus(): Promise<VaultStatus>;
}
