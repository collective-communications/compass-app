export class CliNotFoundError extends Error {
  readonly code = 'CLI_NOT_FOUND' as const;
  constructor() {
    super('Supabase CLI not found. Install with: brew install supabase/tap/supabase');
    this.name = 'CliNotFoundError';
  }
}

export class SupabaseAuthError extends Error {
  readonly code = 'SUPABASE_AUTH' as const;
  constructor(message?: string) {
    super(message ?? 'Supabase authentication failed');
    this.name = 'SupabaseAuthError';
  }
}

export class SupabaseTimeoutError extends Error {
  readonly code = 'SUPABASE_TIMEOUT' as const;
  readonly timeoutMs: number;
  constructor(timeoutMs: number) {
    super(`Supabase CLI command timed out after ${timeoutMs}ms`);
    this.name = 'SupabaseTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export class SupabaseApiError extends Error {
  readonly code = 'SUPABASE_API' as const;
  readonly statusCode: number;
  constructor(statusCode: number, message?: string) {
    super(message ?? `Supabase API returned status ${statusCode}`);
    this.name = 'SupabaseApiError';
    this.statusCode = statusCode;
  }
}
