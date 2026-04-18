/**
 * Pure orchestration for the send-reminders edge function.
 *
 * Factored out of index.ts so the cron hot path is testable under Bun without
 * esm.sh or Deno.*. The `index.ts` entry composes this with `Deno.serve`,
 * `Deno.env.get`, and the live Supabase client.
 *
 * Perf shape vs. the original inline implementation:
 *   - Per survey, the three independent lookups (organizations, email_templates,
 *     deployments) are fired in parallel via `Promise.all`. `survey_recipients`
 *     must wait because it depends on `deployment.id`.
 *   - Per-recipient sends are batched via `Promise.allSettled` over slices of
 *     `BATCH_SIZE`, mirroring `send-invitations`. After each batch: ONE update
 *     call for success IDs, ONE log insert.
 *   - A single survey's template/deployment/recipient miss does NOT throw — it
 *     records an error and continues to the next survey.
 *
 * The email-send side effect is injected via `opts.send` so tests can stub the
 * Resend path and observe failure isolation without hitting the network.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  escapeHtml,
  renderTemplate,
  sanitizeUrl,
  daysBetween,
  shouldSkipReminder,
} from './_lib.ts';

export const BATCH_SIZE = 14;

export interface SendRemindersInput {
  appUrl: string;
  /** Override for deterministic testing. Defaults to `new Date()`. */
  now?: Date;
}

export interface SendRemindersResult {
  /** Number of surveys with at least one eligible recipient considered. */
  surveysProcessed: number;
  /** Total reminders sent successfully across all surveys. */
  totalSent: number;
  /** Total per-recipient send failures across all surveys. */
  totalFailed: number;
  /** Surveys skipped because no recipient was eligible for a reminder today. */
  skipped: number;
  /** Per-survey errors (missing template, missing deployment, etc.). */
  errors: Array<{ surveyId: string; message: string }>;
}

export type SendFn = (msg: {
  to: string;
  subject: string;
  html: string;
}) => Promise<{ id: string | null; error: string | null }>;

interface Recipient {
  id: string;
  email: string;
  name: string | null;
  invitation_sent_at: string | null;
  reminder_sent_at: string | null;
}

interface Survey {
  id: string;
  title: string;
  organization_id: string;
  closes_at: string | null;
  reminder_schedule: number[] | null;
}

interface Template {
  subject: string;
  html_body: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Orchestrate the reminder cron pass.
 *
 * Iterates every active survey with a non-empty `reminder_schedule`. For each
 * survey, loads org/template/deployment in parallel and the recipient list
 * once the deployment id is known. Recipients whose "days since invite"
 * matches a scheduled day AND who haven't been reminded in the last 23 hours
 * are rendered and sent in batches.
 *
 * Result semantics:
 *   - `surveysProcessed`: surveys that had at least one eligible recipient to
 *     attempt (regardless of per-recipient success).
 *   - `skipped`: surveys whose recipients were all ineligible today (no match
 *     on schedule, or all within the 23h dedup window). Also bumps when a
 *     survey has no recipients at all.
 *   - Missing template or missing deployment does NOT bump `skipped` — it
 *     records an error in `errors` and moves on.
 */
export async function sendReminders(
  client: SupabaseClient,
  input: SendRemindersInput,
  opts: { batchDelayMs?: number; send?: SendFn } = {},
): Promise<SendRemindersResult> {
  const batchDelayMs = opts.batchDelayMs ?? 1000;
  const send = opts.send ?? defaultSendViaEdge(client);
  const now = input.now ?? new Date();

  const result: SendRemindersResult = {
    surveysProcessed: 0,
    totalSent: 0,
    totalFailed: 0,
    skipped: 0,
    errors: [],
  };

  const { data: surveys, error: surveyError } = await client
    .from('surveys')
    .select('id, title, organization_id, closes_at, reminder_schedule')
    .eq('status', 'active')
    .not('reminder_schedule', 'eq', '[]');

  if (surveyError) {
    throw new Error(`Failed to load surveys: ${surveyError.message}`);
  }

  if (!surveys || surveys.length === 0) {
    return result;
  }

  for (const survey of surveys as Survey[]) {
    const schedule: number[] = survey.reminder_schedule ?? [];
    if (schedule.length === 0) {
      result.skipped++;
      continue;
    }

    // Fan out the three independent lookups in parallel. `survey_recipients`
    // depends on deployment.id and runs after.
    const [deploymentResp, orgResp, templatesResp] = await Promise.all([
      client
        .from('deployments')
        .select('id, token')
        .eq('survey_id', survey.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      client
        .from('organizations')
        .select('name')
        .eq('id', survey.organization_id)
        .maybeSingle(),
      client
        .from('email_templates')
        .select('*')
        .eq('template_type', 'reminder')
        .or(`org_id.eq.${survey.organization_id},org_id.is.null`)
        .order('org_id', { ascending: false, nullsFirst: false })
        .limit(1),
    ]);

    const deployment = deploymentResp.data as { id: string; token: string } | null;
    const org = orgResp.data as { name: string } | null;
    const template = (templatesResp.data as Template[] | null)?.[0];

    if (!deployment) {
      result.errors.push({ surveyId: survey.id, message: 'Deployment not found' });
      continue;
    }
    if (!org) {
      result.errors.push({ surveyId: survey.id, message: 'Organization not found' });
      continue;
    }
    if (!template) {
      result.errors.push({ surveyId: survey.id, message: 'Reminder template not found' });
      continue;
    }

    const { data: recipientsRaw, error: recipError } = await client
      .from('survey_recipients')
      .select('id, email, name, invitation_sent_at, reminder_sent_at')
      .eq('deployment_id', deployment.id)
      .eq('status', 'invited');

    if (recipError) {
      result.errors.push({
        surveyId: survey.id,
        message: `Failed to load recipients: ${recipError.message}`,
      });
      continue;
    }

    const recipients = (recipientsRaw ?? []) as Recipient[];
    if (recipients.length === 0) {
      result.skipped++;
      continue;
    }

    // Filter down to recipients eligible for a reminder today.
    const eligible = recipients.filter((r) => {
      if (!r.invitation_sent_at) return false;
      if (shouldSkipReminder(r.reminder_sent_at, now)) return false;
      const daysSinceInvite = daysBetween(r.invitation_sent_at, now);
      return schedule.includes(daysSinceInvite);
    });

    if (eligible.length === 0) {
      result.skipped++;
      continue;
    }

    result.surveysProcessed++;

    const closesAt = survey.closes_at
      ? new Date(survey.closes_at).toLocaleDateString('en-CA', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : 'TBD';

    // Sanitize the survey link before it lands inside an `<a href="…">` in the
    // rendered email body. `input.appUrl` is configured by the operator but we
    // harden the template-render path in depth.
    const surveyLink = sanitizeUrl(`${input.appUrl}/s/${deployment.token}`, {
      fallback: input.appUrl,
    });

    for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
      const batch = eligible.slice(i, i + BATCH_SIZE);

      const rendered = batch.map((recipient) => {
        const recipientName = escapeHtml(recipient.name ?? '');
        const escapedOrgName = escapeHtml(org.name);
        const subject = renderTemplate(template.subject, {
          organization_name: escapedOrgName,
          recipient_name: recipientName,
        });
        const html = renderTemplate(template.html_body, {
          organization_name: escapedOrgName,
          survey_link: surveyLink,
          recipient_name: recipientName,
          close_date: closesAt,
        });
        return { recipient, to: recipient.email, subject, html };
      });

      const results = await Promise.allSettled(
        rendered.map((r) => send({ to: r.to, subject: r.subject, html: r.html })),
      );

      const successIds: string[] = [];
      const failureLogs: Array<Record<string, unknown>> = [];

      for (let j = 0; j < results.length; j++) {
        const settled = results[j];
        const recipient = rendered[j].recipient;

        if (settled.status === 'fulfilled') {
          const res = settled.value;
          if (res.error) {
            result.totalFailed++;
            failureLogs.push({
              recipient_email: recipient.email,
              template_type: 'reminder',
              status: 'failed',
              error_message: res.error,
              survey_id: survey.id,
            });
          } else {
            successIds.push(recipient.id);
            result.totalSent++;
          }
        } else {
          const msg =
            settled.reason instanceof Error ? settled.reason.message : 'Unknown error';
          result.totalFailed++;
          failureLogs.push({
            recipient_email: recipient.email,
            template_type: 'reminder',
            status: 'failed',
            error_message: msg,
            survey_id: survey.id,
          });
        }
      }

      // ONE update for all successful IDs in this batch.
      if (successIds.length > 0) {
        await client
          .from('survey_recipients')
          .update({ reminder_sent_at: now.toISOString() })
          .in('id', successIds);

        const logEntries = successIds.map((id) => {
          const r = rendered.find((x) => x.recipient.id === id)!.recipient;
          return {
            recipient_email: r.email,
            template_type: 'reminder',
            status: 'sent',
            survey_id: survey.id,
          };
        });
        await client.from('email_log').insert(logEntries);
      }

      // Log failures together as well — keeps the shape symmetric with
      // send-invitations and avoids N round trips.
      if (failureLogs.length > 0) {
        await client.from('email_log').insert(failureLogs);
      }

      if (i + BATCH_SIZE < eligible.length && batchDelayMs > 0) {
        await delay(batchDelayMs);
      }
    }
  }

  return result;
}

/**
 * Default send: invokes the `send-email` edge function via the Supabase
 * client's `.functions.invoke()`. Kept separate so tests don't need to stub
 * `client.functions`.
 */
function defaultSendViaEdge(client: SupabaseClient): SendFn {
  return async (msg) => {
    const { data, error: sendError } = await client.functions.invoke('send-email', {
      body: {
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        templateType: 'reminder',
      },
    });
    if (sendError) return { id: null, error: sendError.message };
    const id = (data && typeof data === 'object' && 'id' in data
      ? (data as { id: string | null }).id
      : null) ?? null;
    return { id, error: null };
  };
}
