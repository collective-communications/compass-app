export class GitHubApiError extends Error {
  readonly code: string = 'GITHUB_API_ERROR';
  readonly statusCode: number;

  constructor(statusCode: number, message?: string) {
    super(message ?? `GitHub API returned status ${statusCode}`);
    this.name = 'GitHubApiError';
    this.statusCode = statusCode;
  }

  static async fromResponse(res: Response): Promise<GitHubApiError> {
    let message: string | undefined;
    try {
      const body = (await res.json()) as { message?: string };
      message = body?.message;
    } catch {
      // ignore parse failures
    }

    switch (res.status) {
      case 401:
        return new GitHubAuthError(message);
      case 403: {
        const rateLimitRemaining = res.headers.get('X-RateLimit-Remaining');
        if (rateLimitRemaining === '0') {
          const resetHeader = res.headers.get('X-RateLimit-Reset');
          const resetAt = resetHeader ? parseInt(resetHeader, 10) * 1000 : undefined;
          return new GitHubRateLimitError(resetAt, message);
        }
        return new GitHubForbiddenError(message);
      }
      case 404:
        return new GitHubNotFoundError(message);
      case 422:
        return new GitHubValidationError(message);
      case 429: {
        const retryAfter = res.headers.get('Retry-After');
        const resetAt = retryAfter ? Date.now() + parseInt(retryAfter, 10) * 1000 : undefined;
        return new GitHubRateLimitError(resetAt, message);
      }
      default:
        return new GitHubApiError(res.status, message);
    }
  }
}

export class GitHubAuthError extends GitHubApiError {
  override readonly code = 'GITHUB_AUTH_ERROR' as const;

  constructor(message?: string) {
    super(401, message ?? 'GitHub authentication failed');
    this.name = 'GitHubAuthError';
  }
}

export class GitHubForbiddenError extends GitHubApiError {
  override readonly code = 'GITHUB_FORBIDDEN' as const;

  constructor(message?: string) {
    super(403, message ?? 'GitHub access forbidden');
    this.name = 'GitHubForbiddenError';
  }
}

export class GitHubNotFoundError extends GitHubApiError {
  override readonly code = 'GITHUB_NOT_FOUND' as const;

  constructor(message?: string) {
    super(404, message ?? 'GitHub resource not found');
    this.name = 'GitHubNotFoundError';
  }
}

export class GitHubValidationError extends GitHubApiError {
  override readonly code = 'GITHUB_VALIDATION' as const;

  constructor(message?: string) {
    super(422, message ?? 'GitHub validation failed');
    this.name = 'GitHubValidationError';
  }
}

export class GitHubRateLimitError extends GitHubApiError {
  override readonly code = 'GITHUB_RATE_LIMIT' as const;
  readonly resetAt: number | undefined;

  constructor(resetAt?: number, message?: string) {
    super(403, message ?? 'GitHub rate limit exceeded');
    this.name = 'GitHubRateLimitError';
    this.resetAt = resetAt;
  }
}

export class GitHubTimeoutError extends Error {
  readonly code = 'GITHUB_TIMEOUT' as const;

  constructor(timeoutMs: number) {
    super(`GitHub request timed out after ${timeoutMs}ms`);
    this.name = 'GitHubTimeoutError';
  }
}

export class GitHubEncryptionError extends Error {
  readonly code = 'GITHUB_ENCRYPTION' as const;

  constructor(message?: string) {
    super(message ?? 'Failed to encrypt secret — ensure tweetnacl is installed');
    this.name = 'GitHubEncryptionError';
  }
}
