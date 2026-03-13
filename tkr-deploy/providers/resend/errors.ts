export class ResendApiError extends Error {
  readonly code: string = 'RESEND_API_ERROR';
  readonly statusCode: number;

  constructor(statusCode: number, message?: string) {
    super(message ?? `Resend API returned status ${statusCode}`);
    this.name = 'ResendApiError';
    this.statusCode = statusCode;
  }

  static async fromResponse(res: Response): Promise<ResendApiError> {
    let message: string | undefined;
    try {
      const body = (await res.json()) as { message?: string; name?: string };
      message = body?.message;
    } catch {
      // ignore parse failures
    }

    switch (res.status) {
      case 401:
        return new ResendAuthError(message);
      case 404:
        return new ResendNotFoundError(message);
      case 429: {
        const retryAfter = res.headers.get('Retry-After');
        const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;
        return new ResendRateLimitError(retryAfterMs, message);
      }
      default:
        return new ResendApiError(res.status, message);
    }
  }
}

export class ResendAuthError extends ResendApiError {
  override readonly code = 'RESEND_AUTH_ERROR' as const;

  constructor(message?: string) {
    super(401, message ?? 'Resend authentication failed — invalid API key');
    this.name = 'ResendAuthError';
  }
}

export class ResendRateLimitError extends ResendApiError {
  override readonly code = 'RESEND_RATE_LIMIT' as const;
  readonly retryAfterMs: number | undefined;

  constructor(retryAfterMs?: number, message?: string) {
    super(429, message ?? 'Resend rate limit exceeded');
    this.name = 'ResendRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

export class ResendNotFoundError extends ResendApiError {
  override readonly code = 'RESEND_NOT_FOUND' as const;

  constructor(message?: string) {
    super(404, message ?? 'Resend resource not found');
    this.name = 'ResendNotFoundError';
  }
}

export class ResendTimeoutError extends Error {
  readonly code = 'RESEND_TIMEOUT' as const;

  constructor(timeoutMs: number) {
    super(`Resend request timed out after ${timeoutMs}ms`);
    this.name = 'ResendTimeoutError';
  }
}
