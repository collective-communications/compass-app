/**
 * EmailScreen — Resend plugin sections (domain / DNS / sending / API key),
 * anchored by "last touched run #X".
 *
 * @module screens/email
 */

import type { JSX } from 'preact';
import { ProviderScreen } from './_ProviderScreen.js';

export function EmailScreen(): JSX.Element {
  return <ProviderScreen providerId="resend" title="Email" anchorVerb="last touched in" />;
}
