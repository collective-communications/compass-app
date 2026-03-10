/**
 * Edge function for sending survey invitation emails to recipients.
 * Loads recipients with status='pending', renders the invitation template,
 * sends via send-email function, and updates recipient status.
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface SendInvitationsRequest {
  surveyId: string;
  deploymentId: string;
}

// ─── Batch Delay ─────────────────────────────────────────────────────────────

/** Delay to respect SES rate limits (~14/sec production) */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // GET = health check
  if (req.method === 'GET') {
    return jsonResponse({ status: 'ok', function: 'send-invitations' });
  }

  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Only POST/GET accepted', 405);
  }

  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const client = createClient(supabaseUrl, serviceRoleKey);

  // Authorize
  const authResult = await authorize(req, client);
  if ('error' in authResult) return authResult.error;

  // Parse body
  let body: SendInvitationsRequest;
  try {
    body = await req.json();
    if (!body.surveyId || !body.deploymentId) {
      return errorResponse('INVALID_REQUEST', 'surveyId and deploymentId are required', 400);
    }
  } catch {
    return errorResponse('INVALID_REQUEST', 'Request body must be valid JSON', 400);
  }

  try {
    // Load survey + deployment + org info
    const { data: survey, error: surveyError } = await client
      .from('surveys')
      .select('id, title, organization_id, closes_at')
      .eq('id', body.surveyId)
      .single();

    if (surveyError || !survey) {
      return errorResponse('NOT_FOUND', 'Survey not found', 404);
    }

    const { data: deployment, error: deployError } = await client
      .from('deployments')
      .select('id, token')
      .eq('id', body.deploymentId)
      .single();

    if (deployError || !deployment) {
      return errorResponse('NOT_FOUND', 'Deployment not found', 404);
    }

    const { data: org, error: orgError } = await client
      .from('organizations')
      .select('name')
      .eq('id', survey.organization_id)
      .single();

    if (orgError || !org) {
      return errorResponse('NOT_FOUND', 'Organization not found', 404);
    }

    // Load template (org-specific first, then default)
    const { data: templates } = await client
      .from('email_templates')
      .select('*')
      .eq('template_type', 'survey_invitation')
      .or(`org_id.eq.${survey.organization_id},org_id.is.null`)
      .order('org_id', { ascending: false, nullsFirst: false })
      .limit(1);

    const template = templates?.[0];
    if (!template) {
      return errorResponse('CONFIG_ERROR', 'No invitation email template found', 500);
    }

    // Load pending recipients
    const { data: recipients, error: recipError } = await client
      .from('survey_recipients')
      .select('*')
      .eq('survey_id', body.surveyId)
      .eq('status', 'pending');

    if (recipError) {
      return errorResponse('DB_ERROR', `Failed to load recipients: ${recipError.message}`, 500);
    }

    if (!recipients || recipients.length === 0) {
      return jsonResponse({ sent: 0, failed: 0, errors: [], message: 'No pending recipients' });
    }

    // Build base survey link
    const appUrl = Deno.env.get('APP_URL') ?? 'https://app.collectivecommunication.ca';
    const baseSurveyLink = `${appUrl}/s/${deployment.token}`;

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

    // Send to each recipient in batches (14/sec SES limit)
    const BATCH_SIZE = 14;
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      // Per-recipient tracked link using email hash
      const emailHash = await crypto.subtle
        .digest('SHA-256', new TextEncoder().encode(recipient.email))
        .then((buf) =>
          Array.from(new Uint8Array(buf))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
            .slice(0, 12),
        );

      const surveyLink = `${baseSurveyLink}?ref=${emailHash}`;

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
        // Invoke send-email function
        const { error: sendError } = await client.functions.invoke('send-email', {
          body: {
            to: recipient.email,
            subject: renderedSubject,
            html: renderedBody,
            templateType: 'survey_invitation',
          },
        });

        if (sendError) {
          throw new Error(sendError.message);
        }

        // Update recipient status
        await client
          .from('survey_recipients')
          .update({
            status: 'invited',
            invitation_sent_at: new Date().toISOString(),
          })
          .eq('id', recipient.id);

        sent++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${recipient.email}: ${msg}`);
        failed++;
      }

      // Rate limiting: pause after each batch
      if ((i + 1) % BATCH_SIZE === 0 && i + 1 < recipients.length) {
        await delay(1000);
      }
    }

    return jsonResponse({ sent, failed, errors });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return errorResponse('SEND_INVITATIONS_FAILED', message, 500);
  }
});
