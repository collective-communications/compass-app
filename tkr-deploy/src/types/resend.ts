export interface DnsRecord {
  type: 'TXT' | 'CNAME';
  name: string;
  value: string;
  status: 'verified' | 'not_started';
}

export interface ResendDomain {
  id: string;
  name: string;
  status: 'verified' | 'pending' | 'not_started';
  region: string;
  createdAt: string;
  records: DnsRecord[];
}

export interface SendingStats {
  monthTotal: number;
  monthLimit: number;
  todayCount: number;
  rateLimit: number;
  bounceRate: number;
}

export interface ApiKeyMeta {
  id: string;
  name: string;
  createdAt: string;
  permission: 'full_access' | 'sending_access';
  domainId: string | null;
}
