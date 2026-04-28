/**
 * DatabaseScreen — Supabase plugin sections (connection / migrations / functions / extensions),
 * anchored by "applied in run #X".
 *
 * @module screens/database
 */

import type { JSX } from 'preact';
import { ProviderScreen } from './_ProviderScreen.js';

export function DatabaseScreen(): JSX.Element {
  return <ProviderScreen providerId="supabase" title="Database" anchorVerb="last applied in" />;
}
