-- Allow anonymous users to update their own answers (needed for upsert)
CREATE POLICY "anon_update_own_answers" ON answers FOR UPDATE
  USING (
    auth.role() = 'anon'
    AND is_valid_response(response_id)
  );
