-- Allow anonymous users to read question_dimensions for active surveys.
-- Required because the getQuestions query joins question_dimensions, and
-- PostgREST fails the join entirely if the anon role can't access the table.
CREATE POLICY "anon_read_question_dimensions" ON question_dimensions FOR SELECT
  USING (
    auth.role() = 'anon'
  );
