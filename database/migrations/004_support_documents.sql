ALTER TABLE media_assets
  ALTER COLUMN width DROP NOT NULL,
  ALTER COLUMN height DROP NOT NULL;

ALTER TABLE media_assets
  DROP CONSTRAINT media_assets_mime_type_check,
  DROP CONSTRAINT media_assets_extension_check,
  DROP CONSTRAINT media_assets_width_check,
  DROP CONSTRAINT media_assets_height_check,
  DROP CONSTRAINT media_assets_check,
  DROP CONSTRAINT media_assets_check2;

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
