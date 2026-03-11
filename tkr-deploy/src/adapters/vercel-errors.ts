export class VercelApiError extends Error {
  readonly code: string = 'VERCEL_API_ERROR';
  readonly statusCode: number;

  constructor(statusCode: number, message?: string) {
    super(message ?? `Vercel API returned status ${statusCode}`);
    this.name = 'VercelApiError';
    this.statusCode = statusCode;
  }

  static async fromResponse(res: Response): Promise<VercelApiError> {
    let message: string | undefined;
    try {
      const body = await res.json() as { error?: { message?: string } };
      message = body?.error?.message;
    } catch {
      // ignore parse failures
    }

    switch (res.status) {
      case 401:
        return new VercelAuthError(message);
      case 404:
        return new VercelNotFoundError(message);
      case 429: {
        const retryAfter = res.headers.get('Retry-After');
        const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;
        return new VercelRateLimitError(retryAfterMs, message);
      }
      default:
        return new VercelApiError(res.status, message);
    }
  }
}

export class VercelAuthError extends VercelApiError {
  override readonly code = 'VERCEL_AUTH_ERROR' as const;

  constructor(message?: string) {
    super(401, message ?? 'Vercel authentication failed');
    this.name = 'VercelAuthError';
  }
}

export class VercelNotFoundError extends VercelApiError {
  override readonly code = 'VERCEL_NOT_FOUND' as const;

  constructor(message?: string) {
    super(404, message ?? 'Vercel resource not found');
    this.name = 'VercelNotFoundError';
  }
}

export class VercelRateLimitError extends VercelApiError {
  override readonly code = 'VERCEL_RATE_LIMIT' as const;
  readonly retryAfterMs: number | undefined;

  constructor(retryAfterMs?: number, message?: string) {
    super(429, message ?? 'Vercel rate limit exceeded');
    this.name = 'VercelRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

export class VercelTimeoutError extends Error {
  readonly code = 'VERCEL_TIMEOUT' as const;

  constructor(timeoutMs: number) {
    super(`Vercel request timed out after ${timeoutMs}ms`);
    this.name = 'VercelTimeoutError';
  }
}
