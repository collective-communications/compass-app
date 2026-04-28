/**
 * FrontendScreen — Vercel plugin sections (project / current deployment / history / env vars),
 * anchored by "deployed in run #X".
 *
 * @module screens/frontend
 */

import type { JSX } from 'preact';
import { ProviderScreen } from './_ProviderScreen.js';

export function FrontendScreen(): JSX.Element {
  return <ProviderScreen providerId="vercel" title="Frontend" anchorVerb="deployed in" />;
}
