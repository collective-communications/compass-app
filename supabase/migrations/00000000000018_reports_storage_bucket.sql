-- Create the reports storage bucket for PDF files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('reports', 'reports', false, 52428800, ARRAY['application/pdf', 'text/html'])
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can read their org's reports
CREATE POLICY reports_storage_read ON storage.objects FOR SELECT
  USING (
    bucket_id = 'reports'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = (storage.foldername(name))[1]::uuid
    )
  );

-- Service role (used by edge functions) bypasses RLS — no insert/update policy needed.
