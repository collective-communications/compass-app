/**
 * Edge function for sending survey reminder emails.
 * Triggered by pg_cron daily. Checks active surveys with reminder_schedule,
 * finds recipients who should receive a reminder based on days since invitation.
 *
 * Orchestration lives in `handler.ts` so the cron hot path is testable under
 * Bun without the Deno runtime.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorize } from './auth.ts';
import { sendReminders } from './handler.ts';

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

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // GET = health check
  if (req.method === 'GET') {
    return jsonResponse({ status: 'ok', function: 'send-reminders' });
  }

  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Only POST/GET accepted', 405);
  }

  // Authorize: service_role only (cron trigger).
  const authCheck = authorize(req);
  if ('error' in authCheck) return authCheck.error;

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const client = createClient(supabaseUrl, serviceRoleKey);
  const appUrl = Deno.env.get('APP_URL') ?? 'https://app.collectiveculturecompass.com';

  try {
    const result = await sendReminders(client, { appUrl });
    return jsonResponse({
      surveysProcessed: result.surveysProcessed,
      skipped: result.skipped,
      remindersSent: result.totalSent,
      failed: result.totalFailed,
      errors: result.errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return errorResponse('REMINDERS_FAILED', message, 500);
  }
});
