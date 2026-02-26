/**
 * Typed environment variables for the application.
 * Each field corresponds to a required or optional env var.
 */
export interface AppEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_APP_URL: string;
}
