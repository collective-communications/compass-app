import type { DeployConfig } from './src/types/plugin.js';
import { createSupabasePlugin } from './providers/supabase/index.js';
import { createVercelPlugin } from './providers/vercel/index.js';
import { createResendPlugin } from './providers/resend/index.js';
import { createGitHubPlugin } from './providers/github/index.js';

const config: DeployConfig = {
  name: 'compass-app',
  vault: { url: 'http://localhost:42042', vaultName: 'compass' },
  port: 42043,
  providers: [
    createSupabasePlugin({ projectRoot: '..' }),
    createVercelPlugin(),
    createResendPlugin({ apiKeySecret: 'RESEND_CCC_ADMIN' }),
    createGitHubPlugin(),
  ],
};

export default config;
