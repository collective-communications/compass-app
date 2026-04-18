/**
 * Pure orchestration for the send-team-invitation edge function.
 *
 * Factored out of index.ts so the happy-path, config-error, expiry, and send-
 * failure branches are testable under Bun without esm.sh or Deno.*. The
 * `index.ts` entry composes this with `Deno.serve`, `Deno.env.get`, and the
 * live Supabase client.
 *
 * The email-send side effect is injected via the `send` parameter so tests
 * can stub the transport without hitting the network.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { escapeHtml, renderTemplate, sanitizeUrl, ROLE_LABELS } from './_lib.ts';

export interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateType: 'team_invitation';
}

/**
 * Send transport. Matches the shape of the `send-email` edge function: returns
 * the provider message id (null if unknown) plus an optional error string so
 * tests can observe provider failures without throwing.
 */
export type SendFn = (
  msg: SendEmailArgs,
) => Promise<{ id: string | null; error: string | null }>;

export interface SendTeamInvitationInput {
  invitationId: string;
}

export interface SendTeamInvitationResult {
  status: number;
  body: Record<string, unknown>;
}

export interface SendTeamInvitationOptions {
  appUrl?: string;
  send?: SendFn;
  now?: Date;
}

/**
 * Execute the send-team-invitation flow for a single invitation id.
 *
 * Returns a `{ status, body }` pair so the caller (index.ts) can build the
 * exact HTTP response without the handler owning response headers.
 *
 * Side effects (happy path):
 *   - `invitations.email_status` flipped from 'pending' → 'sent'
 *   - `invitations.sent_at` set to `now`
 *   - On send failure: `invitations.email_status` flipped to 'failed'
 */
export async function sendTeamInvitation(
  client: SupabaseClient,
  input: SendTeamInvitationInput,
  opts: SendTeamInvitationOptions = {},
): Promise<SendTeamInvitationResult> {
  const appUrl = opts.appUrl ?? 'https://app.collectiveculturecompass.com';
  const send = opts.send ?? defaultSendViaEdge(client);
  const now = opts.now ?? new Date();

  // ─── Load invitation ─────────────────────────────────────────────────────
  const { data: invitation, error: invError } = await client
    .from('invitations')
    .select('*')
    .eq('id', input.invitationId)
    .single();

  if (invError || !invitation) {
    return {
      status: 404,
      body: { error: 'INVITATION_NOT_FOUND', message: 'Invitation not found' },
    };
  }

  // ─── Expiry check ────────────────────────────────────────────────────────
  // Mirrors the guard in `accept-invitation/handlers.ts`. We surface EXPIRED
  // here too so admins see the real reason when "resend" fails instead of a
  // rendered email landing in the recipient's inbox for an invitation that
  // cannot actually be accepted.
  if (invitation.expires_at && new Date(invitation.expires_at as string) < now) {
    return {
      status: 410,
      body: { error: 'EXPIRED', message: 'Invitation has expired' },
    };
  }

  // ─── Load org (optional) ─────────────────────────────────────────────────
  let orgContext = '';
  if (invitation.organization_id) {
    const { data: org } = await client
      .from('organizations')
      .select('name')
      .eq('id', invitation.organization_id as string)
      .single();

    if (org && (org as { name?: string }).name) {
      orgContext = ` for ${escapeHtml((org as { name: string }).name)}`;
    }
  }

  // ─── Load template (org-specific preferred, default fallback) ────────────
  const orgFilter = invitation.organization_id
    ? `org_id.eq.${invitation.organization_id},org_id.is.null`
    : 'org_id.is.null';

  const { data: templates } = await client
    .from('email_templates')
    .select('*')
    .eq('template_type', 'team_invitation')
    .or(orgFilter)
    .order('org_id', { ascending: false, nullsFirst: false })
    .limit(1);

  const template = (templates as Array<{ subject: string; html_body: string }> | null)?.[0];
  if (!template) {
    return {
      status: 500,
      body: {
        error: 'CONFIG_ERROR',
        message: 'No team invitation email template found',
      },
    };
  }

  // ─── Render subject + body ───────────────────────────────────────────────
  //
  // The accept link is sanitized before being interpolated into the template
  // so a misconfigured APP_URL containing `javascript:`/`data:` can never
  // reach the rendered body. `safeAppUrl` is the defensive fallback — if the
  // operator-provided `appUrl` is itself malicious (or missing a scheme),
  // sanitizeUrl will still return an empty string rather than round-trip the
  // bad value back into the href.
  const safeAppUrl = sanitizeUrl(appUrl, { fallback: '' });
  const rawAcceptLink = `${appUrl}/auth/accept-invite?token=${input.invitationId}`;
  const acceptLink = sanitizeUrl(rawAcceptLink, { fallback: safeAppUrl });

  const expiresAt = new Date(invitation.expires_at as string).toLocaleDateString('en-CA', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const roleLabel =
    ROLE_LABELS[invitation.role as string] ?? (invitation.role as string);

  const renderedSubject = renderTemplate(template.subject, {
    role_label: roleLabel,
    org_context: orgContext,
  });
  const renderedBody = renderTemplate(template.html_body, {
    role_label: roleLabel,
    org_context: orgContext,
    accept_link: acceptLink,
    expires_at: expiresAt,
  });

  // ─── Send email ──────────────────────────────────────────────────────────
  const sendResult = await send({
    to: invitation.email as string,
    subject: renderedSubject,
    html: renderedBody,
    templateType: 'team_invitation',
  });

  if (sendResult.error) {
    // Flip invitation to failed so the UI surfaces the error and operators can
    // retry. Do NOT set sent_at — the message never left our infrastructure.
    await client
      .from('invitations')
      .update({ email_status: 'failed' })
      .eq('id', input.invitationId);

    return {
      status: 500,
      body: { error: 'SEND_FAILED', message: sendResult.error },
    };
  }

  // ─── Mark invitation sent ────────────────────────────────────────────────
  await client
    .from('invitations')
    .update({
      email_status: 'sent',
      sent_at: now.toISOString(),
    })
    .eq('id', input.invitationId);

  return {
    status: 200,
    body: {
      success: true,
      invitationId: input.invitationId,
      ...(sendResult.id ? { emailLogId: sendResult.id } : {}),
    },
  };
}

/**
 * Default send: invokes the `send-email` edge function via the Supabase
 * client's `.functions.invoke()`. Kept separate so tests don't need to stub
 * `client.functions`.
 */
function defaultSendViaEdge(client: SupabaseClient): SendFn {
  return async (args) => {
    const { data, error } = await client.functions.invoke('send-email', {
      body: {
        to: args.to,
        subject: args.subject,
        html: args.html,
        templateType: args.templateType,
      },
    });
    if (error) {
      return { id: null, error: error.message };
    }
    const id = (data as { emailLogId?: string; id?: string } | null)?.emailLogId
      ?? (data as { id?: string } | null)?.id
      ?? null;
    return { id, error: null };
  };
}
