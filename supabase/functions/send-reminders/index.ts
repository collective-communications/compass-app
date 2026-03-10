/**
 * Edge function for sending survey reminder emails.
 * Triggered by pg_cron daily. Checks active surveys with reminder_schedule,
 * finds recipients who should receive a reminder based on days since invitation.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize } from './auth.ts';

// ─── JSON Helpers ────────────────────────────────────────────────────────────

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(error: string, message: string, status: number): Response {
  return jsonResponse({ error, message }, status);
}

// ─── Template Rendering ──────────────────────────────────────────────────────

function renderTemplate(
  html: string,
  variables: Record<string, string>,
): string {
  let rendered = html;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value);
  }
  return rendered;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysBetween(from: string, to: Date): number {
  const fromDate = new Date(from);
  const diffMs = to.getTime() - fromDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // GET = health check
  if (req.method === 'GET') {
    return jsonResponse({ status: 'ok', function: 'send-reminders' });
  }

  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Only POST/GET accepted', 405);
  }

  // Authorize: service_role only
  const authCheck = authorize(req);
  if ('error' in authCheck) return authCheck.error;

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const client = createClient(supabaseUrl, serviceRoleKey);
  const appUrl = Deno.env.get('APP_URL') ?? 'https://app.collectivecommunication.ca';

  try {
    // Find active surveys with non-empty reminder schedules
    const { data: surveys, error: surveyError } = await client
      .from('surveys')
      .select('id, title, organization_id, closes_at, reminder_schedule')
      .eq('status', 'active')
      .not('reminder_schedule', 'eq', '[]');

    if (surveyError) {
      return errorResponse('DB_ERROR', `Failed to load surveys: ${surveyError.message}`, 500);
    }

    if (!surveys || surveys.length === 0) {
      return jsonResponse({ surveysChecked: 0, remindersSent: 0 });
    }

    const now = new Date();
    let totalRemindersSent = 0;
    const BATCH_SIZE = 14;
    let batchCounter = 0;

    for (const survey of surveys) {
      const schedule: number[] = survey.reminder_schedule ?? [];
      if (schedule.length === 0) continue;

      // Load deployment for this survey (most recent)
      const { data: deployment } = await client
        .from('deployments')
        .select('token')
        .eq('survey_id', survey.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!deployment) continue;

      // Load org name
      const { data: org } = await client
        .from('organizations')
        .select('name')
        .eq('id', survey.organization_id)
        .single();

      if (!org) continue;

      // Load reminder template
      const { data: templates } = await client
        .from('email_templates')
        .select('*')
        .eq('template_type', 'reminder')
        .or(`org_id.eq.${survey.organization_id},org_id.is.null`)
        .order('org_id', { ascending: false, nullsFirst: false })
        .limit(1);

      const template = templates?.[0];
      if (!template) continue;

      // Find recipients who were invited but not completed
      const { data: recipients } = await client
        .from('survey_recipients')
        .select('*')
        .eq('survey_id', survey.id)
        .eq('status', 'invited');

      if (!recipients || recipients.length === 0) continue;

      const closesAt = survey.closes_at
        ? new Date(survey.closes_at).toLocaleDateString('en-CA', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
        : 'TBD';

      const surveyLink = `${appUrl}/s/${deployment.token}`;

      for (const recipient of recipients) {
        if (!recipient.invitation_sent_at) continue;

        const daysSinceInvite = daysBetween(recipient.invitation_sent_at, now);

        // Check if today matches any scheduled reminder day
        if (!schedule.includes(daysSinceInvite)) continue;

        // Render and send
        const recipientName = recipient.name ?? '';
        const renderedSubject = renderTemplate(template.subject, {
          organization_name: org.name,
          recipient_name: recipientName,
        });
        const renderedBody = renderTemplate(template.html_body, {
          organization_name: org.name,
          survey_link: surveyLink,
          recipient_name: recipientName,
          close_date: closesAt,
        });

        try {
          await client.functions.invoke('send-email', {
            body: {
              to: recipient.email,
              subject: renderedSubject,
              html: renderedBody,
              templateType: 'reminder',
            },
          });

          // Update recipient reminder tracking
          await client
            .from('survey_recipients')
            .update({
              reminder_sent_at: now.toISOString(),
            })
            .eq('id', recipient.id);

          totalRemindersSent++;
          batchCounter++;

          // Rate limiting
          if (batchCounter % BATCH_SIZE === 0) {
            await delay(1000);
          }
        } catch {
          // Log but continue — individual failures should not stop the batch
        }
      }
    }

    return jsonResponse({
      surveysChecked: surveys.length,
      remindersSent: totalRemindersSent,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return errorResponse('REMINDERS_FAILED', message, 500);
  }
});
