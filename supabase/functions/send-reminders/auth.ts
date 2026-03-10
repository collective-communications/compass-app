/**
 * Authorization for the send-reminders edge function.
 * Only accepts service_role key (triggered by cron, not people).
 */

export function authorize(req: Request): { authorized: true } | { error: Response } {
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (
    !authHeader?.startsWith('Bearer ') ||
    authHeader.slice(7) !== serviceRoleKey ||
    serviceRoleKey === ''
  ) {
    return {
      error: new Response(
        JSON.stringify({ error: 'UNAUTHORIZED', message: 'Only service_role can invoke send-reminders' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      ),
    };
  }

  return { authorized: true };
}
