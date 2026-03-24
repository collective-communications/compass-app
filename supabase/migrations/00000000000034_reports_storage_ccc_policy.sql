-- Allow CCC users (admins) to read all report files in storage.
-- The existing reports_storage_read policy only allows org members,
-- which blocks CCC admins who aren't members of the client org.

CREATE POLICY reports_storage_ccc_read ON storage.objects FOR SELECT
  USING (
    bucket_id = 'reports'
    AND is_ccc_user()
  );
