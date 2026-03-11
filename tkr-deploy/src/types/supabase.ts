export interface MigrationEntry {
  filename: string;
  status: 'applied' | 'pending';
  appliedAt: string | null;
}

export interface EdgeFunction {
  name: string;
  deployed: boolean;
  lastDeployed: string | null;
  requiredSecrets: string[];
}

export interface ExtensionStatus {
  name: string;
  version: string | null;
  status: 'available' | 'enabled' | 'unavailable';
  installedVersion: string | null;
}

export interface ConnectionStatus {
  connected: boolean;
  projectRef: string;
  region: string;
  dbVersion: string | null;
}
