-- Bind document reviews to immutable object metadata observed through signed S3 HEAD.
ALTER TABLE ride_driver_documents
 ADD COLUMN IF NOT EXISTS object_etag varchar(130),
 ADD COLUMN IF NOT EXISTS object_bytes bigint CHECK(object_bytes BETWEEN 1 AND 10485760),
 ADD COLUMN IF NOT EXISTS object_content_type varchar(40),
 ADD COLUMN IF NOT EXISTS object_version varchar(200),
 ADD COLUMN IF NOT EXISTS object_checked_at timestamptz;
CREATE INDEX IF NOT EXISTS ride_driver_document_review_idx
 ON ride_driver_documents(review_status,created_at) WHERE review_status='pending';
