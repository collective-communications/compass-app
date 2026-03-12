-- =============================================================================
-- Fix 9: email_log — add survey_id for per-survey email tracking
-- Guarded: email_log may not exist if migration 20 was recorded but table dropped
-- =============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_log') THEN
    ALTER TABLE email_log ADD COLUMN IF NOT EXISTS survey_id UUID REFERENCES surveys(id) ON DELETE SET NULL;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_log_survey_id') THEN
      CREATE INDEX idx_email_log_survey_id ON email_log(survey_id);
    END IF;
  END IF;
END $$;

-- =============================================================================
-- Fix 10: Email template seeds — wrap in proper HTML document structure
-- Guarded: email_templates may not exist
-- =============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_templates') THEN
    UPDATE email_templates SET html_body =
      '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f5f5f5;}table{border-spacing:0;}.wrapper{width:100%;background-color:#f5f5f5;padding:32px 0;}.content{max-width:600px;margin:0 auto;background-color:#ffffff;padding:32px;border-radius:8px;}</style></head><body><table class="wrapper" width="100%"><tr><td align="center"><div class="content">Hello,<br><br>You have been invited to participate in a Culture Compass survey for {{organization_name}}. Click the link below to begin.<br><br><a href="{{survey_link}}">{{survey_link}}</a><br><br>This survey is completely anonymous.</div></td></tr></table></body></html>'
    WHERE template_type = 'survey_invitation' AND org_id IS NULL;

    UPDATE email_templates SET html_body =
      '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f5f5f5;}table{border-spacing:0;}.wrapper{width:100%;background-color:#f5f5f5;padding:32px 0;}.content{max-width:600px;margin:0 auto;background-color:#ffffff;padding:32px;border-radius:8px;}</style></head><body><table class="wrapper" width="100%"><tr><td align="center"><div class="content">Hello,<br><br>This is a reminder that the Culture Compass survey for {{organization_name}} closes on {{close_date}}. If you have not yet completed it, please use the link below.<br><br><a href="{{survey_link}}">{{survey_link}}</a></div></td></tr></table></body></html>'
    WHERE template_type = 'reminder' AND org_id IS NULL;

    UPDATE email_templates SET html_body =
      '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f5f5f5;}table{border-spacing:0;}.wrapper{width:100%;background-color:#f5f5f5;padding:32px 0;}.content{max-width:600px;margin:0 auto;background-color:#ffffff;padding:32px;border-radius:8px;}</style></head><body><table class="wrapper" width="100%"><tr><td align="center"><div class="content">Hello,<br><br>The Culture Compass report for {{organization_name}} is now available. Log in to view your results.<br><br><a href="{{dashboard_link}}">{{dashboard_link}}</a></div></td></tr></table></body></html>'
    WHERE template_type = 'report_ready' AND org_id IS NULL;
  END IF;
END $$;

-- =============================================================================
-- Fix 11: NLP embeddings — add FK constraints + retuned IVFFlat index
-- =============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dialogue_embeddings') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dialogue_embeddings_response_id_fk') THEN
      ALTER TABLE dialogue_embeddings
        ADD CONSTRAINT dialogue_embeddings_response_id_fk
          FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dialogue_embeddings_question_id_fk') THEN
      ALTER TABLE dialogue_embeddings
        ADD CONSTRAINT dialogue_embeddings_question_id_fk
          FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;
    END IF;

    DROP INDEX IF EXISTS dialogue_embeddings_vector_idx;
    CREATE INDEX dialogue_embeddings_vector_idx
      ON dialogue_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
  END IF;
END $$;
