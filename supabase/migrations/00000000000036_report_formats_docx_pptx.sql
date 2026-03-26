-- Expand report format constraint to include 'docx'.
-- Existing values ('pdf', 'pptx') remain valid.
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_format_check;

ALTER TABLE reports
  ADD CONSTRAINT reports_format_check
  CHECK (format IN ('pdf', 'docx', 'pptx'));

-- Expand the reports storage bucket to accept DOCX and PPTX MIME types
-- alongside existing PDF and HTML types.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'text/html',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]
WHERE id = 'reports';
