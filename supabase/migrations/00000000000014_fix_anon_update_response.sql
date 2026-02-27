-- Fix: the update policy's USING was reused as WITH CHECK,
-- which rejected the new row because is_complete becomes true.
-- Add an explicit WITH CHECK that allows the completed state.
DROP POLICY IF EXISTS "anon_update_own_responses" ON responses;
CREATE POLICY "anon_update_own_responses" ON responses FOR UPDATE
  USING (
    auth.role() = 'anon'
    AND is_complete = false
    AND is_valid_deployment(deployment_id)
  )
  WITH CHECK (
    auth.role() = 'anon'
    AND is_valid_deployment(deployment_id)
  );
