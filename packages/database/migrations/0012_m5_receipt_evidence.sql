-- Preserve how verified capture evidence was obtained. Existing receipts came from webhooks.
ALTER TABLE payment_receipts
 ADD COLUMN evidence_source varchar(24) NOT NULL DEFAULT 'webhook'
 CHECK(evidence_source IN ('webhook','provider_recheck')),
 ADD COLUMN verification_actor varchar(255),
 ADD CONSTRAINT payment_receipt_actor CHECK(
  (evidence_source='webhook' AND verification_actor IS NULL)
  OR (evidence_source='provider_recheck' AND verification_actor IS NOT NULL AND length(btrim(verification_actor))>0)
 );
-- payload_sha256 hashes exact signed bytes for webhook evidence, or the normalized
-- independently verified charge object for a provider recheck. Never store card data.
