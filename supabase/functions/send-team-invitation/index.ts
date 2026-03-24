/**
 * Edge function for sending team member invitation emails.
 * Called by the frontend after creating or resending an invitation.
 * Loads the invitation record, renders the team_invitation template,
 * and sends via the send-email function.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SendTeamInvitationRequest {
  invitationId: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(error: string, message: string, status: number): Response {
  return jsonResponse({ error, message }, status);
}

/** Escape HTML special characters to prevent XSS. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Replace `{{key}}` placeholders in a template string. */
function renderTemplate(html: string, variables: Record<string, string>): string {
  let rendered = html;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value);
  }
  return rendered;
}

/** Map role codes to display labels. */
const ROLE_LABELS: Record<string, string> = {
  ccc_admin: 'CC+C Administrator',
  ccc_member: 'CC+C Team Member',
  client_exec: 'Client Executive',
  client_director: 'Client Director',
  client_manager: 'Client Manager',
};

// ─── Main Handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Health check
  if (req.method === 'GET') {
    return jsonResponse({ status: 'ok', function: 'send-team-invitation' });
  }

  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Only POST/GET/OPTIONS accepted', 405);
  }

  // Create Supabase client with service_role for DB access + calling send-email
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const client = createClient(supabaseUrl, serviceRoleKey);

  // Authorize: verify caller is a ccc_admin or ccc_member
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return errorResponse('UNAUTHORIZED', 'Missing Authorization header', 401);
  }

  const token = authHeader.slice(7);

  // Allow service_role direct calls
  if (token !== serviceRoleKey || serviceRoleKey === '') {
    // JWT verification
    const { data: { user }, error: authError } = await client.auth.getUser(token);
    if (authError || !user) {
      return errorResponse('UNAUTHORIZED', 'Invalid or expired token', 401);
    }

    const { data: profile, error: profileError } = await client
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return errorResponse('UNAUTHORIZED', 'User profile not found', 401);
    }

    if (!['ccc_admin', 'ccc_member'].includes(profile.role)) {
      return errorResponse('FORBIDDEN', 'Only CC+C users can send team invitations', 403);
    }
  }

  // Parse body
  let body: SendTeamInvitationRequest;
  try {
    body = await req.json();
    if (!body.invitationId) {
      return errorResponse('INVALID_REQUEST', 'invitationId is required', 400);
    }
  } catch {
    return errorResponse('INVALID_REQUEST', 'Request body must be valid JSON', 400);
  }

  try {
    // Load invitation
    const { data: invitation, error: invError } = await client
      .from('invitations')
      .select('*')
      .eq('id', body.invitationId)
      .single();

    if (invError || !invitation) {
      return errorResponse('NOT_FOUND', 'Invitation not found', 404);
    }

    // Load org name if this is a client invitation
    let orgContext = '';
    if (invitation.organization_id) {
      const { data: org } = await client
        .from('organizations')
        .select('name')
        .eq('id', invitation.organization_id)
        .single();

      if (org) {
        orgContext = ` for ${escapeHtml(org.name)}`;
      }
    }

    // Load template (org-specific first, then default)
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

    const template = templates?.[0];
    if (!template) {
      return errorResponse('CONFIG_ERROR', 'No team invitation email template found', 500);
    }

    // Build accept link
    const appUrl = Deno.env.get('APP_URL') ?? 'https://app.collectiveculturecompass.com';
    const acceptLink = `${appUrl}/auth/accept-invite?token=${body.invitationId}`;

    const expiresAt = new Date(invitation.expires_at).toLocaleDateString('en-CA', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const roleLabel = ROLE_LABELS[invitation.role] ?? invitation.role;

    // Render template
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

    // Send via send-email function
    const { error: sendError } = await client.functions.invoke('send-email', {
      body: {
        to: invitation.email,
        subject: renderedSubject,
        html: renderedBody,
        templateType: 'team_invitation',
      },
    });

    if (sendError) {
      // Update invitation email_status to failed
      await client
        .from('invitations')
        .update({ email_status: 'failed' })
        .eq('id', body.invitationId);

      return errorResponse('SEND_FAILED', sendError.message, 500);
    }

    // Update invitation email_status to sent
    await client
      .from('invitations')
      .update({
        email_status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', body.invitationId);

    return jsonResponse({ success: true, invitationId: body.invitationId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return errorResponse('SEND_TEAM_INVITATION_FAILED', message, 500);
  }
});
