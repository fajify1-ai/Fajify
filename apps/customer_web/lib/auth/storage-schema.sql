-- Deployment artifact only. Never run automatically or against the shared API
-- database without its owner's approval. Use a dedicated customer-web database.
-- Runtime role needs only SELECT, INSERT, UPDATE, DELETE on this table; no DDL.
CREATE SCHEMA customer_web_auth;
CREATE TABLE customer_web_auth.records (
  kind text NOT NULL CHECK (kind IN ('session', 'transaction', 'credential')),
  id_digest text NOT NULL CHECK (id_digest ~ '^[a-f0-9]{64}$'),
  payload text NOT NULL,
  expires_at_ms bigint NOT NULL CHECK (expires_at_ms > 0),
  PRIMARY KEY (kind, id_digest)
);
CREATE INDEX records_expiry ON customer_web_auth.records (expires_at_ms);
-- Schedule bounded expiry cleanup with the storage owner. Expired records are
-- denied on every read even if cleanup is delayed.
