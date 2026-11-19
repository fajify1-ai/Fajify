ALTER TABLE payment_intents
 ADD COLUMN execution_mode varchar(16) NOT NULL DEFAULT 'legacy'
 CHECK(execution_mode IN ('legacy','simulated')),
 ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE payment_intents DROP CONSTRAINT payment_intents_provider_check;
ALTER TABLE payment_intents ADD CONSTRAINT payment_intents_provider_check CHECK(provider IN ('paystack','simulation'));

ALTER TABLE payment_intents DROP CONSTRAINT payment_intents_status_check;
ALTER TABLE payment_intents ADD CONSTRAINT payment_intents_status_check
 CHECK(status IN ('pending','succeeded','failed','cancelled'));

ALTER TABLE checkout_sessions DROP CONSTRAINT checkout_sessions_state_check;
ALTER TABLE checkout_sessions ADD CONSTRAINT checkout_sessions_state_check
 CHECK(state IN ('initializing','ready','uncertain','closed','simulated'));

ALTER TABLE payment_receipts DROP CONSTRAINT payment_receipts_evidence_source_check;
ALTER TABLE payment_receipts ADD CONSTRAINT payment_receipts_evidence_source_check
 CHECK(evidence_source IN ('webhook','provider_recheck','simulation'));
ALTER TABLE payment_receipts DROP CONSTRAINT payment_receipt_actor;
ALTER TABLE payment_receipts ADD CONSTRAINT payment_receipt_actor CHECK(
 (evidence_source='webhook' AND verification_actor IS NULL)
 OR (evidence_source IN ('provider_recheck','simulation') AND verification_actor IS NOT NULL AND length(btrim(verification_actor))>0)
);

CREATE TABLE payment_lifecycle_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 intent_id uuid NOT NULL REFERENCES payment_intents(id) ON DELETE RESTRICT,
 event_type varchar(40) NOT NULL CHECK(event_type IN ('created','legacy_state_import','simulated_success','simulated_failure','simulated_cancellation')),
 previous_status varchar(16) CHECK(previous_status IN ('pending','succeeded','failed','cancelled')),
 resulting_status varchar(16) NOT NULL CHECK(resulting_status IN ('pending','succeeded','failed','cancelled')),
 actor_subject varchar(255) NOT NULL CHECK(length(btrim(actor_subject))>0),
 source varchar(16) NOT NULL CHECK(source IN ('system','migration','simulation')),
 idempotency_key varchar(160) NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(
  (event_type='created' AND previous_status IS NULL AND resulting_status='pending' AND source IN ('system','migration'))
  OR (event_type='legacy_state_import' AND previous_status='pending' AND resulting_status='succeeded' AND source='migration')
  OR (event_type='simulated_success' AND previous_status='pending' AND resulting_status='succeeded' AND source='simulation')
  OR (event_type='simulated_failure' AND previous_status='pending' AND resulting_status='failed' AND source='simulation')
  OR (event_type='simulated_cancellation' AND previous_status='pending' AND resulting_status='cancelled' AND source='simulation')
 )
);
CREATE INDEX payment_lifecycle_history_idx ON payment_lifecycle_events(intent_id,created_at,id);
CREATE FUNCTION payment_lifecycle_events_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Payment lifecycle history is append-only'; END;
$$;
CREATE TRIGGER payment_lifecycle_events_immutable
 BEFORE UPDATE OR DELETE ON payment_lifecycle_events
 FOR EACH ROW EXECUTE FUNCTION payment_lifecycle_events_immutable();

INSERT INTO payment_lifecycle_events(intent_id,event_type,previous_status,resulting_status,actor_subject,source,idempotency_key,created_at)
 SELECT id,'created',NULL,'pending',customer_subject,'migration','payment:'||id::text||':created',created_at
 FROM payment_intents;
INSERT INTO payment_lifecycle_events(intent_id,event_type,previous_status,resulting_status,actor_subject,source,idempotency_key)
 SELECT id,'legacy_state_import','pending','succeeded',customer_subject,'migration','payment:'||id::text||':legacy_state'
 FROM payment_intents WHERE status='succeeded';

CREATE FUNCTION payment_intent_created_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO payment_lifecycle_events(intent_id,event_type,previous_status,resulting_status,actor_subject,source,idempotency_key)
 VALUES(NEW.id,'created',NULL,NEW.status,NEW.customer_subject,'system','payment:'||NEW.id::text||':created');
 RETURN NEW;
END;
$$;
CREATE TRIGGER payment_intent_created_event
 AFTER INSERT ON payment_intents FOR EACH ROW EXECUTE FUNCTION payment_intent_created_event();

CREATE OR REPLACE FUNCTION m5_guard_intent() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Payment intent history is immutable'; END IF;
 IF ROW(NEW.id,NEW.customer_subject,NEW.business_id,NEW.request_key,NEW.provider,NEW.provider_reference,NEW.environment,NEW.amount_minor,NEW.currency,NEW.created_at,NEW.execution_mode)
 IS DISTINCT FROM ROW(OLD.id,OLD.customer_subject,OLD.business_id,OLD.request_key,OLD.provider,OLD.provider_reference,OLD.environment,OLD.amount_minor,OLD.currency,OLD.created_at,OLD.execution_mode)
 THEN RAISE EXCEPTION 'Payment intent fields are immutable'; END IF;
 IF NEW.status IS DISTINCT FROM OLD.status AND OLD.status<>'pending'
 THEN RAISE EXCEPTION 'Terminal payment state cannot transition'; END IF;
 IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('succeeded','failed','cancelled')
 THEN RAISE EXCEPTION 'Invalid payment state transition'; END IF;
 RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION m5_check_posting() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; payment payment_intents%ROWTYPE; receipt_count integer; journal_count integer;
BEGIN
 IF TG_TABLE_NAME='payment_intents' THEN target:=NEW.id; ELSE target:=NEW.intent_id; END IF;
 SELECT * INTO payment FROM payment_intents WHERE id=target;
 SELECT count(*) INTO receipt_count FROM payment_receipts WHERE intent_id=target;
 SELECT count(*) INTO journal_count FROM ledger_entries WHERE intent_id=target AND amount_minor=payment.amount_minor AND currency=payment.currency;
 IF (payment.status='succeeded' AND (receipt_count<>1 OR journal_count<>1))
 OR (payment.status<>'succeeded' AND (receipt_count<>0 OR journal_count<>0)) THEN
  RAISE EXCEPTION 'Payment, receipt and balanced journal must reconcile';
 END IF;
 RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION m5_current_order_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous uuid; expected uuid;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Current payment attempt cannot be removed'; END IF;
 IF TG_OP='UPDATE' AND NEW.order_id<>OLD.order_id THEN RAISE EXCEPTION 'M5: Retry chain order is immutable'; END IF;
 IF TG_OP='UPDATE' THEN previous:=OLD.intent_id; ELSE SELECT intent_id INTO previous FROM payment_order_links WHERE order_id=NEW.order_id; END IF;
 SELECT previous_intent_id INTO expected FROM payment_order_attempts WHERE intent_id=NEW.intent_id AND order_id=NEW.order_id;
 IF expected IS NULL OR previous IS NULL OR (previous<>NEW.intent_id AND expected<>previous) OR
  (previous<>NEW.intent_id AND NOT EXISTS(SELECT 1 FROM payment_intents WHERE id=previous AND status IN ('failed','cancelled')))
 THEN RAISE EXCEPTION 'Invalid or non-terminal payment retry'; END IF;
 RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION m5_attempt_chain_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM payment_intents WHERE id=NEW.intent_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM finance_order_links WHERE intent_id=NEW.intent_id)
 OR NOT EXISTS(SELECT 1 FROM payment_order_links l LEFT JOIN payment_order_current n ON n.order_id=l.order_id
  JOIN payment_intents p ON p.id=coalesce(n.intent_id,l.intent_id)
  WHERE l.order_id=NEW.order_id AND p.id=NEW.previous_intent_id AND p.status IN ('failed','cancelled'))
 THEN RAISE EXCEPTION 'M5: Retry parent must be terminal and belong to the same order'; END IF;
 RETURN NEW;
END;
$$;
