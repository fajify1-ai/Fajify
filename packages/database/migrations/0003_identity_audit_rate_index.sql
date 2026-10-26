-- Speeds up the database-backed per-actor administrative request quota.
-- This index contains no credentials or customer profile details.
CREATE INDEX IF NOT EXISTS identity_security_events_admin_quota_idx
 ON identity_security_events(actor_subject,occurred_at DESC)
 WHERE event_type='admin_request';
