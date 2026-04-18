/**
 * Pure orchestration for the send-invitations edge function.
 *
 * Factored out of index.ts so happy-path, closed-survey, and partial-failure
 * branches are testable under Bun without esm.sh or Deno.*. The `index.ts`
 * entry composes this with `Deno.serve`, `Deno.env.get`, and the live
 * Supabase client.
 *
 * The email-send side effect is injected via the `send` parameter so tests
 * can stub Resend and observe failure propagation without hitting the
 * network.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { escapeHtml, renderTemplate, sanitizeUrl } from './_lib.ts';

export const BATCH_SIZE = 14;

export interface SendInvitationArgs {
  to: string;
  subject: string;
  html: string;
  templateType: 'survey_invitation';
}

export type SendFn = (args: SendInvitationArgs) => Promise<void>;

export interface SendInvitationsInput {
  surveyId: string;
  deploymentId: string;
  appUrl: string;
}

export interface SendInvitationsResult {
  status: number;
  body: Record<string, unknown>;
}

interface Recipient {
  id: string;
  email: string;
  name: string | null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute the send-invitations flow for a single (survey, deployment) pair.
 *
 * Returns a `{ status, body }` pair so the caller (index.ts) can build the
 * exact HTTP response without the handler owning response headers.
 *
 * On a batch that has partial failures, the caller still returns a 200 body
 * with `{ sent, failed, errors }` — matching the original behavior.
 */
export async function sendInvitations(
  client: SupabaseClient,
  input: SendInvitationsInput,
  opts: { batchDelayMs?: number; send?: SendFn } = {},
): Promise<SendInvitationsResult> {
  const batchDelayMs = opts.batchDelayMs ?? 1000;
  const send = opts.send ?? defaultSendViaEdge(client);

  // Load survey + deployment + org info
  const { data: survey, error: surveyError } = await client
    .from('surveys')
    .select('id, title, organization_id, closes_at')
    .eq('id', input.surveyId)
    .single();

  if (surveyError || !survey) {
    return { status: 404, body: { error: 'NOT_FOUND', message: 'Survey not found' } };
  }

  const { data: deployment, error: deployError } = await client
    .from('deployments')
    .select('id, token')
    .eq('id', input.deploymentId)
    .single();

  if (deployError || !deployment) {
    return { status: 404, body: { error: 'NOT_FOUND', message: 'Deployment not found' } };
  }

  const { data: org, error: orgError } = await client
    .from('organizations')
    .select('name')
    .eq('id', survey.organization_id)
    .single();

  if (orgError || !org) {
    return { status: 404, body: { error: 'NOT_FOUND', message: 'Organization not found' } };
  }

  const { data: templates } = await client
    .from('email_templates')
    .select('*')
    .eq('template_type', 'survey_invitation')
    .or(`org_id.eq.${survey.organization_id},org_id.is.null`)
    .order('org_id', { ascending: false, nullsFirst: false })
    .limit(1);

  const template = templates?.[0] as
    | { subject: string; html_body: string }
    | undefined;
  if (!template) {
    return {
      status: 500,
      body: { error: 'CONFIG_ERROR', message: 'No invitation email template found' },
    };
  }

  const { data: recipients, error: recipError } = await client
    .from('survey_recipients')
    .select('*')
    .eq('survey_id', input.surveyId)
    .eq('status', 'pending');

  if (recipError) {
    return {
      status: 500,
      body: { error: 'DB_ERROR', message: `Failed to load recipients: ${recipError.message}` },
    };
  }

  if (!recipients || recipients.length === 0) {
    return {
      status: 200,
      body: { sent: 0, failed: 0, errors: [], message: 'No pending recipients' },
    };
  }

  // Sanitize the survey link before it lands inside an `<a href="…">` in the
  // rendered email body. `input.appUrl` is configured by the operator, but we
  // harden the template-render path against accidental misconfiguration — and
  // against any future code path that routes an untrusted value through here.
  const rawSurveyLink = `${input.appUrl}/s/${deployment.token}`;
  const surveyLink = sanitizeUrl(rawSurveyLink, { fallback: input.appUrl });
  const closesAt = survey.closes_at
    ? new Date(survey.closes_at).toLocaleDateString('en-CA', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'TBD';

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  const recipientList = recipients as Recipient[];

  for (let i = 0; i < recipientList.length; i += BATCH_SIZE) {
    const batch = recipientList.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (recipient) => {
        const recipientName = escapeHtml(recipient.name ?? '');
        const escapedOrgName = escapeHtml(org.name);

        const renderedSubject = renderTemplate(template.subject, {
          organization_name: escapedOrgName,
          recipient_name: recipientName,
        });
        const renderedBody = renderTemplate(template.html_body, {
          organization_name: escapedOrgName,
          survey_link: surveyLink,
          recipient_name: recipientName,
          close_date: closesAt,
        });

        await send({
          to: recipient.email,
          subject: renderedSubject,
          html: renderedBody,
          templateType: 'survey_invitation',
        });

        return recipient.id;
      }),
    );

    const successIds: string[] = [];
    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === 'fulfilled') {
        successIds.push(result.value);
        sent++;
      } else {
        const msg = result.reason instanceof Error ? result.reason.message : 'Unknown error';
        errors.push(`recipient_${i + j + 1}: ${msg}`);
        failed++;

        await client.from('email_log').insert({
          recipient_email: batch[j].email,
          template_type: 'survey_invitation',
          status: 'failed',
          error_message: msg,
          survey_id: input.surveyId,
        });
      }
    }

    if (successIds.length > 0) {
      await client
        .from('survey_recipients')
        .update({
          status: 'invited',
          invitation_sent_at: new Date().toISOString(),
        })
        .in('id', successIds);

      const logEntries = successIds.map((id) => {
        const recipient = batch.find((r) => r.id === id)!;
        return {
          recipient_email: recipient.email,
          template_type: 'survey_invitation',
          status: 'sent',
          survey_id: input.surveyId,
        };
      });
      await client.from('email_log').insert(logEntries);
    }

    if (i + BATCH_SIZE < recipientList.length && batchDelayMs > 0) {
      await delay(batchDelayMs);
    }
  }

  return { status: 200, body: { sent, failed, errors } };
}

/**
 * Default send: invokes the `send-email` edge function via the Supabase
 * client's `.functions.invoke()`. Kept separate so tests don't need to stub
 * `client.functions`.
 */
function defaultSendViaEdge(client: SupabaseClient): SendFn {
  return async (args) => {
    const { error: sendError } = await client.functions.invoke('send-email', {
      body: {
        to: args.to,
        subject: args.subject,
        html: args.html,
        templateType: args.templateType,
      },
    });
    if (sendError) throw new Error(sendError.message);
  };
}
