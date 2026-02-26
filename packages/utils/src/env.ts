/**
 * Error thrown when a required environment variable is missing or empty.
 */
export class MissingEnvError extends Error {
  /** The name of the missing variable */
  readonly variable: string;

  constructor(variable: string) {
    super(`Missing required environment variable: ${variable}`);
    this.name = 'MissingEnvError';
    this.variable = variable;
  }
}

/**
 * Reads an environment variable from the runtime environment.
 * Works in both Vite (import.meta.env) and Node/Bun (process.env) contexts.
 */
function readEnv(name: string): string | undefined {
  // Vite injects env vars at build time via import.meta.env
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta = (import.meta as any).env;
  if (meta && typeof meta[name] === 'string') {
    return meta[name] as string;
  }
  // Fallback for Node/Bun runtime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  if (typeof g.process !== 'undefined') {
    return g.process.env[name] as string | undefined;
  }
  return undefined;
}

/**
 * Validates and returns a required environment variable.
 * Throws if the variable is missing or empty.
 *
 * @param name - Environment variable name
 * @returns The variable value
 * @throws MissingEnvError if the variable is undefined or empty string
 */
export function requireEnv(name: string): string {
  const value = readEnv(name);
  if (value === undefined || value === '') {
    throw new MissingEnvError(name);
  }
  return value;
}

/**
 * Returns an environment variable or a default value.
 *
 * @param name - Environment variable name
 * @param fallback - Default value if not set
 * @returns The variable value or fallback
 */
export function optionalEnv(name: string, fallback: string): string {
  const value = readEnv(name);
  if (value === undefined || value === '') {
    return fallback;
  }
  return value;
}
