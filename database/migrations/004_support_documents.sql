ALTER TABLE media_assets
  ALTER COLUMN width DROP NOT NULL,
  ALTER COLUMN height DROP NOT NULL;

DO $migration$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT constraint_info.conname
    FROM pg_constraint AS constraint_info
    WHERE constraint_info.conrelid = 'media_assets'::regclass
      AND constraint_info.contype = 'c'
      AND (
        position('mime_type' IN pg_get_constraintdef(constraint_info.oid)) > 0
        OR position('extension' IN pg_get_constraintdef(constraint_info.oid)) > 0
        OR position('width' IN pg_get_constraintdef(constraint_info.oid)) > 0
        OR position('height' IN pg_get_constraintdef(constraint_info.oid)) > 0
        OR position('public_filename' IN pg_get_constraintdef(constraint_info.oid)) > 0
        OR position('storage_key' IN pg_get_constraintdef(constraint_info.oid)) > 0
      )
  LOOP
    EXECUTE format('ALTER TABLE media_assets DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END;
$migration$;

ALTER TABLE media_assets
  ADD CONSTRAINT media_assets_mime_type_check CHECK (mime_type IN (
    'image/jpeg',
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )),
  ADD CONSTRAINT media_assets_extension_check CHECK (extension IN ('jpg', 'png', 'pdf', 'doc', 'docx')),
  ADD CONSTRAINT media_assets_dimensions_check CHECK (
    (mime_type IN ('image/jpeg', 'image/png') AND width > 0 AND height > 0)
    OR
    (mime_type IN (
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) AND width IS NULL AND height IS NULL)
  ),
  ADD CONSTRAINT media_assets_public_filename_check
    CHECK (public_filename ~ '^[a-z0-9][a-z0-9-]{0,119}\.(jpg|png|pdf|doc|docx)$'),
  ADD CONSTRAINT media_assets_storage_key_consistency_check
    CHECK (storage_key = public_filename),
  ADD CONSTRAINT media_assets_format_check CHECK (
    (mime_type = 'image/jpeg' AND extension = 'jpg') OR
    (mime_type = 'image/png' AND extension = 'png') OR
    (mime_type = 'application/pdf' AND extension = 'pdf') OR
    (mime_type = 'application/msword' AND extension = 'doc') OR
    (
      mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      AND extension = 'docx'
    )
  );
