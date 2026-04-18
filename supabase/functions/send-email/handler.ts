/**
 * Pure orchestration for the send-email edge function.
 *
 * Factored out of index.ts so the happy-path, provider-4xx, and provider-5xx
 * branches are testable under Bun without esm.sh or Deno.*. The `index.ts`
 * entry composes this with `Deno.serve`, `Deno.env.get`, and `createClient`
 * from esm.sh.
 *
 * The provider (Resend by default) is injected via the `sendProvider`
 * function so tests can simulate success, 4xx, and 5xx without hitting the
 * network.
 *
 * ## Behavior compatibility
 *
 * The legacy entry point collapsed ALL provider failures to 500
 * `SEND_FAILED`. To preserve that contract exactly, the handler exposes an
 * optional `errorMapping` mode:
 *   - `'legacy'` (default): any provider error → 500 `SEND_FAILED` with the
 *     error message. Matches the original behavior bit-for-bit.
 *   - `'structured'`: 4xx provider errors → 400 `PROVIDER_REJECTED`;
 *     5xx provider errors → 503 `PROVIDER_UNAVAILABLE` (retryable).
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface SendEmailRequest {
  to: string;
  subject: string;
  html: string;
  templateType: 'survey_invitation' | 'reminder' | 'report_ready' | 'team_invitation';
  replyTo?: string;
}

export interface SendProviderResult {
  messageId: string;
}

/**
 * Provider is expected to throw a {@link ProviderError} when the upstream
 * provider returns a non-2xx response. The error's `kind` drives the HTTP
 * envelope the handler returns in `'structured'` mode.
 */
export class ProviderError extends Error {
  constructor(public readonly kind: 'client_error' | 'server_error', message: string) {
    super(message);
    this.name = 'ProviderError';
  }
}

export type SendProviderFn = (args: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) => Promise<SendProviderResult>;

export interface SendEmailResult {
  status: number;
  body: Record<string, unknown>;
}

export interface SendEmailOptions {
  /**
   * Controls how provider failures are mapped to HTTP responses.
   *   - `'legacy'` (default): 500 SEND_FAILED for all provider errors.
   *     This matches the pre-refactor index.ts behavior exactly.
   *   - `'structured'`: 400 for 4xx, 503 for 5xx (retryable).
   */
  errorMapping?: 'legacy' | 'structured';
}

/**
 * Send a single email, logging queued → sent/failed transitions.
 */
export async function sendEmail(
  client: SupabaseClient,
  body: SendEmailRequest,
  sendProvider: SendProviderFn,
  opts: SendEmailOptions = {},
): Promise<SendEmailResult> {
  const errorMapping = opts.errorMapping ?? 'legacy';

  const { data: logEntry, error: logError } = await client
    .from('email_log')
    .insert({
      recipient: body.to,
      subject: body.subject,
      template_type: body.templateType,
      status: 'queued',
    })
    .select('id')
    .single();

  if (logError) {
    return {
      status: 500,
      body: { error: 'LOG_ERROR', message: `Failed to create email log: ${logError.message}` },
    };
  }

  const logId = (logEntry as { id: string }).id;

  try {
    const { messageId } = await sendProvider({
      to: body.to,
      subject: body.subject,
      html: body.html,
      replyTo: body.replyTo,
    });

    await client
      .from('email_log')
      .update({
        status: 'sent',
        provider_message_id: messageId,
        sent_at: new Date().toISOString(),
      })
      .eq('id', logId);

    return { status: 200, body: { success: true, logId, messageId } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const kind = err instanceof ProviderError ? err.kind : 'server_error';

    await client
      .from('email_log')
      .update({ status: 'failed', error: message })
      .eq('id', logId);

    if (errorMapping === 'legacy') {
      return { status: 500, body: { error: 'SEND_FAILED', message } };
    }

    // structured mapping
    if (kind === 'client_error') {
      return { status: 400, body: { error: 'PROVIDER_REJECTED', message } };
    }
    return { status: 503, body: { error: 'PROVIDER_UNAVAILABLE', message, retryable: true } };
  }
}

/**
 * Default Resend provider factory. Reads the API key at call time so tests
 * that shim `Deno.env` can force a configuration-error path.
 */
export function makeResendProvider(
  apiKey: string,
  fromAddress: string,
): SendProviderFn {
  return async ({ to, subject, html, replyTo }) => {
    if (!apiKey) {
      throw new ProviderError('server_error', 'RESEND_API_KEY must be set');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject,
        html,
        ...(replyTo ? { reply_to: [replyTo] } : {}),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      const kind = response.status >= 500 ? 'server_error' : 'client_error';
      throw new ProviderError(kind, `Resend ${response.status}: ${err.slice(0, 200)}`);
    }

    const data = (await response.json()) as { id: string };
    return { messageId: data.id };
  };
}
