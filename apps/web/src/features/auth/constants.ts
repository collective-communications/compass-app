export const LOGIN_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid email or password.',
  ACCOUNT_LOCKED: 'Account locked. Contact your administrator.',
  NETWORK_ERROR: 'Unable to connect. Please try again.',
  OAUTH_FAILED: (provider: string): string =>
    `Sign-in with ${provider} failed. Please try again.`,
  UNKNOWN: 'Something went wrong. Please try again.',
} as const;
