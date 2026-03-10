-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Embeddings for open-text dialogue responses
CREATE TABLE dialogue_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL,
  question_id UUID NOT NULL,
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL,
  model_version TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite unique constraint for idempotent upserts
CREATE UNIQUE INDEX dialogue_embeddings_response_model_idx
  ON dialogue_embeddings(response_id, model_version);

-- Vector similarity search index
CREATE INDEX dialogue_embeddings_vector_idx
  ON dialogue_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Standard lookup indexes
CREATE INDEX dialogue_embeddings_survey_idx ON dialogue_embeddings(survey_id);
CREATE INDEX dialogue_embeddings_question_idx ON dialogue_embeddings(question_id);

-- RLS
ALTER TABLE dialogue_embeddings ENABLE ROW LEVEL SECURITY;

-- CC+C users can read all embeddings
CREATE POLICY "ccc_users_read_embeddings" ON dialogue_embeddings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('ccc_admin', 'ccc_member')
    )
  );

-- Client users can read their org's survey embeddings
CREATE POLICY "client_users_read_own_embeddings" ON dialogue_embeddings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN surveys s ON s.id = dialogue_embeddings.survey_id
      WHERE up.id = auth.uid()
      AND up.role IN ('client_exec', 'client_director', 'client_manager')
      AND s.organization_id = ANY(up.assigned_clients)
    )
  );

-- Service role can insert/update (edge functions)
CREATE POLICY "service_role_manage_embeddings" ON dialogue_embeddings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
