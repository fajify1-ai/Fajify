-- M5-P1 complete lifecycle. Existing capture and historical migrations remain unchanged.
CREATE TABLE finance_policies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES business_onboarding(id), version integer NOT NULL CHECK(version>0),
 commission_bps integer NOT NULL CHECK(commission_bps BETWEEN 0 AND 10000),
 gateway_fee_bearer varchar(8) NOT NULL CHECK(gateway_fee_bearer IN ('platform','merchant')),
 payout_fee_bearer varchar(8) NOT NULL CHECK(payout_fee_bearer IN ('platform','merchant')),
 settlement_delay_hours integer NOT NULL CHECK(settlement_delay_hours BETWEEN 0 AND 8760),
 refund_window_hours integer NOT NULL CHECK(refund_window_hours BETWEEN 0 AND 8760),
 cancellation_cutoff_minutes integer NOT NULL CHECK(cancellation_cutoff_minutes BETWEEN 0 AND 525600),
 hold_minutes integer NOT NULL CHECK(hold_minutes BETWEEN 1 AND 30),
 approved_by varchar(255) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(business_id,version)
);
CREATE INDEX finance_policy_business_idx ON finance_policies(business_id,created_at DESC,id DESC);
CREATE TRIGGER finance_policies_immutable BEFORE UPDATE OR DELETE ON finance_policies FOR EACH ROW EXECUTE FUNCTION m5_immutable_record();
CREATE TABLE payment_terms (
 intent_id uuid PRIMARY KEY REFERENCES payment_intents(id), policy_id uuid NOT NULL REFERENCES finance_policies(id),
 commission_minor bigint NOT NULL CHECK(commission_minor>=0), merchant_minor bigint NOT NULL CHECK(merchant_minor>=0),
 allocated_at timestamptz, fulfilled_at timestamptz, eligible_at timestamptz, recovered_minor bigint NOT NULL DEFAULT 0 CHECK(recovered_minor>=0),
 resolution varchar(32) NOT NULL DEFAULT 'pending' CHECK(resolution IN ('pending','confirmed','refund_required','cancelled'))
);
CREATE INDEX payment_terms_eligible_idx ON payment_terms(eligible_at,intent_id) WHERE allocated_at IS NOT NULL AND resolution='confirmed';
CREATE INDEX payment_terms_unfulfilled_idx ON payment_terms(intent_id) WHERE fulfilled_at IS NULL AND resolution='confirmed';
CREATE TABLE checkout_sessions (
 intent_id uuid PRIMARY KEY REFERENCES payment_intents(id), email varchar(254) NOT NULL,
 state varchar(16) NOT NULL CHECK(state IN ('initializing','ready','uncertain','closed')),
 authorization_url text, access_code varchar(255), attempted_at timestamptz NOT NULL DEFAULT now(),
 CHECK((state='ready')=(authorization_url IS NOT NULL AND access_code IS NOT NULL))
);
CREATE TABLE payment_order_attempts (
 intent_id uuid PRIMARY KEY REFERENCES payment_intents(id), order_id uuid NOT NULL REFERENCES business_orders(id),
 previous_intent_id uuid NOT NULL REFERENCES payment_intents(id), created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(intent_id<>previous_intent_id), UNIQUE(order_id,previous_intent_id)
);
CREATE TRIGGER payment_order_attempt_bind BEFORE INSERT ON payment_order_attempts FOR EACH ROW EXECUTE FUNCTION m5_bind_order_intent();
CREATE TRIGGER payment_order_attempts_immutable BEFORE UPDATE OR DELETE ON payment_order_attempts FOR EACH ROW EXECUTE FUNCTION m5_immutable_record();
CREATE VIEW finance_order_links AS SELECT order_id,intent_id FROM payment_order_links UNION ALL SELECT order_id,intent_id FROM payment_order_attempts;
CREATE TABLE payment_order_current (
 order_id uuid PRIMARY KEY REFERENCES business_orders(id), intent_id uuid NOT NULL UNIQUE REFERENCES payment_order_attempts(intent_id)
);
CREATE FUNCTION m5_current_order_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous uuid; expected uuid;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Current payment attempt cannot be removed'; END IF;
 IF TG_OP='UPDATE' AND NEW.order_id<>OLD.order_id THEN RAISE EXCEPTION 'M5: Retry chain order is immutable'; END IF;
 IF TG_OP='UPDATE' THEN previous:=OLD.intent_id; ELSE SELECT intent_id INTO previous FROM payment_order_links WHERE order_id=NEW.order_id; END IF;
 SELECT previous_intent_id INTO expected FROM payment_order_attempts WHERE intent_id=NEW.intent_id AND order_id=NEW.order_id;
 IF expected IS NULL OR previous IS NULL OR (previous<>NEW.intent_id AND expected<>previous) OR
  (previous<>NEW.intent_id AND EXISTS(SELECT 1 FROM payment_intents WHERE id=previous AND status='succeeded'))
 THEN RAISE EXCEPTION 'Invalid or already paid order retry'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER payment_order_current_guard BEFORE INSERT OR UPDATE OR DELETE ON payment_order_current FOR EACH ROW EXECUTE FUNCTION m5_current_order_guard();
CREATE FUNCTION m5_attempt_chain_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM payment_intents WHERE id=NEW.intent_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM finance_order_links WHERE intent_id=NEW.intent_id) OR NOT EXISTS(SELECT 1 FROM payment_order_links l LEFT JOIN payment_order_current n ON n.order_id=l.order_id JOIN payment_intents p ON p.id=coalesce(n.intent_id,l.intent_id) WHERE l.order_id=NEW.order_id AND p.id=NEW.previous_intent_id AND p.status='pending')
 THEN RAISE EXCEPTION 'M5: Retry parent must belong to the same unpaid order'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER payment_order_attempt_chain BEFORE INSERT ON payment_order_attempts FOR EACH ROW EXECUTE FUNCTION m5_attempt_chain_guard();
CREATE FUNCTION m5_root_intent_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM payment_intents WHERE id=NEW.intent_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM finance_order_links WHERE intent_id=NEW.intent_id)
 THEN RAISE EXCEPTION 'M5: An intent cannot belong to multiple order attempts'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER payment_order_root_guard BEFORE INSERT ON payment_order_links FOR EACH ROW EXECUTE FUNCTION m5_root_intent_guard();
CREATE FUNCTION m5_paid_order_transition() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE payment uuid;
BEGIN
 IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.status='cancelled' THEN RETURN NEW; END IF;
 SELECT intent_id INTO payment FROM payment_order_current WHERE order_id=NEW.id;
 IF payment IS NULL THEN SELECT intent_id INTO payment FROM payment_order_links WHERE order_id=NEW.id; END IF;
 IF payment IS NOT NULL AND NOT EXISTS(SELECT 1 FROM payment_intents p JOIN payment_terms t ON t.intent_id=p.id WHERE p.id=payment AND p.status='succeeded' AND t.resolution='confirmed')
 THEN RAISE EXCEPTION 'M5: Verified payment is required for this order'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER business_order_paid_transition BEFORE UPDATE OF status ON business_orders FOR EACH ROW EXECUTE FUNCTION m5_paid_order_transition();
CREATE TABLE finance_environment (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), environment varchar(4) NOT NULL CHECK(environment IN ('test','live'))
);
CREATE TRIGGER finance_environment_immutable BEFORE UPDATE OR DELETE ON finance_environment FOR EACH ROW EXECUTE FUNCTION m5_immutable_record();
CREATE TABLE ticket_inventory (
 catalogue_id uuid PRIMARY KEY REFERENCES business_event_config(catalogue_id),
 capacity integer NOT NULL CHECK(capacity>0), held integer NOT NULL DEFAULT 0 CHECK(held>=0),
 issued integer NOT NULL DEFAULT 0 CHECK(issued>=0), CHECK(held+issued<=capacity)
);
CREATE TABLE paid_holds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), intent_id uuid NOT NULL UNIQUE REFERENCES payment_intents(id),
 customer_subject varchar(255) NOT NULL, business_id uuid NOT NULL REFERENCES business_onboarding(id),
 branch_id uuid NOT NULL, catalogue_id uuid NOT NULL,
 kind varchar(16) NOT NULL CHECK(kind IN ('reservation','ticket')), availability_id uuid REFERENCES business_availability(id),
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 50), guest_name varchar(120) NOT NULL CHECK(length(btrim(guest_name)) BETWEEN 1 AND 120),
 request_key varchar(100) NOT NULL, expires_at timestamptz NOT NULL, key_id varchar(80),
 status varchar(16) NOT NULL DEFAULT 'held' CHECK(status IN ('held','confirmed','expired','cancelled','late')),
 reservation_id uuid UNIQUE REFERENCES business_reservations(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(customer_subject,request_key),
 FOREIGN KEY(catalogue_id,business_id,branch_id) REFERENCES business_catalogue(id,business_id,branch_id),
 CHECK((kind='reservation')=(availability_id IS NOT NULL)), CHECK(kind<>'ticket' OR key_id IS NOT NULL)
);
CREATE INDEX paid_holds_expiry_idx ON paid_holds(expires_at,intent_id) WHERE status='held';
CREATE INDEX paid_holds_customer_idx ON paid_holds(customer_subject,created_at DESC,id DESC);
CREATE FUNCTION m5_paid_cancellation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE payment uuid; cutoff integer; window_hours integer; start_time timestamptz; verified timestamptz;
BEGIN
 IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.status<>'cancelled' OR current_setting('faji.customer_actor',true) IS DISTINCT FROM NEW.customer_subject THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='business_orders' THEN
  SELECT coalesce(n.intent_id,l.intent_id) INTO payment FROM payment_order_links l LEFT JOIN payment_order_current n ON n.order_id=l.order_id WHERE l.order_id=NEW.id;
 ELSE
  SELECT h.intent_id,a.starts_at INTO payment,start_time FROM paid_holds h JOIN business_availability a ON a.id=h.availability_id WHERE h.reservation_id=NEW.id;
 END IF;
 IF payment IS NULL OR NOT EXISTS(SELECT 1 FROM payment_intents WHERE id=payment AND status='succeeded') THEN RETURN NEW; END IF;
 SELECT f.cancellation_cutoff_minutes,f.refund_window_hours,r.verified_at INTO cutoff,window_hours,verified
  FROM payment_terms t JOIN finance_policies f ON f.id=t.policy_id JOIN payment_receipts r ON r.intent_id=t.intent_id WHERE t.intent_id=payment;
 IF verified IS NULL OR verified+window_hours*interval '1 hour'<now() OR (start_time IS NOT NULL AND start_time<=now()+cutoff*interval '1 minute')
 THEN RAISE EXCEPTION 'M5: Paid cancellation policy requires support review'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER business_order_paid_cancellation BEFORE UPDATE OF status ON business_orders FOR EACH ROW EXECUTE FUNCTION m5_paid_cancellation_guard();
CREATE TRIGGER business_reservation_paid_cancellation BEFORE UPDATE OF status ON business_reservations FOR EACH ROW EXECUTE FUNCTION m5_paid_cancellation_guard();
CREATE TABLE issued_tickets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hold_id uuid NOT NULL REFERENCES paid_holds(id),
 ordinal integer NOT NULL CHECK(ordinal>0), nonce varchar(64) NOT NULL, key_id varchar(80) NOT NULL,
 state varchar(16) NOT NULL DEFAULT 'issued' CHECK(state IN ('issued','redeemed','revoked')),
 redeemed_at timestamptz, redeemed_by varchar(255), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(hold_id,ordinal), CHECK((state='redeemed')=(redeemed_at IS NOT NULL AND redeemed_by IS NOT NULL))
);
CREATE TABLE finance_postings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), posting_key varchar(200) NOT NULL UNIQUE,
 intent_id uuid NOT NULL REFERENCES payment_intents(id), debit_account_id uuid NOT NULL,
 credit_account_id uuid NOT NULL, currency varchar(3) NOT NULL DEFAULT 'NGN', amount_minor bigint NOT NULL CHECK(amount_minor>0),
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(debit_account_id<>credit_account_id),
 FOREIGN KEY(debit_account_id,currency) REFERENCES ledger_accounts(id,currency),
 FOREIGN KEY(credit_account_id,currency) REFERENCES ledger_accounts(id,currency)
);
CREATE TABLE finance_account_owners (
 account_id uuid PRIMARY KEY REFERENCES ledger_accounts(id), business_id uuid REFERENCES business_onboarding(id),
 category varchar(32) NOT NULL
);
INSERT INTO finance_account_owners(account_id,category) SELECT id,code FROM ledger_accounts WHERE code IN ('gateway_clearing','customer_funds');
CREATE TRIGGER finance_account_owners_immutable BEFORE UPDATE OR DELETE ON finance_account_owners FOR EACH ROW EXECUTE FUNCTION m5_immutable_record();
CREATE FUNCTION m5_posting_scope() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE business uuid;
BEGIN
 SELECT business_id INTO business FROM payment_intents WHERE id=NEW.intent_id;
 IF (SELECT count(*) FROM finance_account_owners WHERE account_id IN (NEW.debit_account_id,NEW.credit_account_id) AND (business_id IS NULL OR business_id=business))<>2
 THEN RAISE EXCEPTION 'M5: Ledger account ownership mismatch'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER finance_posting_scope BEFORE INSERT ON finance_postings FOR EACH ROW EXECUTE FUNCTION m5_posting_scope();
CREATE TRIGGER finance_postings_immutable BEFORE UPDATE OR DELETE ON finance_postings FOR EACH ROW EXECUTE FUNCTION m5_immutable_record();
CREATE VIEW finance_all_postings AS
 SELECT id,intent_id,debit_account_id,credit_account_id,currency,amount_minor,created_at FROM ledger_entries
 UNION ALL SELECT id,intent_id,debit_account_id,credit_account_id,currency,amount_minor,created_at FROM finance_postings;
CREATE TABLE finance_refunds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), intent_id uuid NOT NULL REFERENCES payment_intents(id),
 request_key varchar(100) NOT NULL, amount_minor bigint NOT NULL CHECK(amount_minor>0), reason varchar(500) NOT NULL,
 state varchar(16) NOT NULL DEFAULT 'requested' CHECK(state IN ('requested','approved','submitting','pending','processed','failed','uncertain','rejected')),
 created_by varchar(255) NOT NULL, decided_by varchar(255), provider_id varchar(100) UNIQUE,
 funding jsonb, external boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(intent_id,request_key)
);
CREATE INDEX finance_refunds_state_idx ON finance_refunds(state,updated_at);
CREATE TABLE payment_fees (
 intent_id uuid PRIMARY KEY REFERENCES payment_receipts(intent_id), amount_minor bigint NOT NULL CHECK(amount_minor>=0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER payment_fees_immutable BEFORE UPDATE OR DELETE ON payment_fees FOR EACH ROW EXECUTE FUNCTION m5_immutable_record();
CREATE TABLE finance_reconciliation_cases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), intent_id uuid NOT NULL REFERENCES payment_intents(id),
 kind varchar(40) NOT NULL, provider_id varchar(100) NOT NULL, state varchar(12) NOT NULL DEFAULT 'open' CHECK(state IN ('open','resolved')),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(intent_id,kind,provider_id)
);
CREATE TABLE merchant_recipients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES business_onboarding(id),
 recipient_code varchar(100) NOT NULL, environment varchar(4) NOT NULL CHECK(environment IN ('test','live')),
 verified_by varchar(255) NOT NULL, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(business_id,recipient_code,environment)
);
CREATE TABLE settlement_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES business_onboarding(id),
 request_key varchar(100) NOT NULL, recipient_id uuid NOT NULL REFERENCES merchant_recipients(id),
 recipient_code varchar(100) NOT NULL, environment varchar(4) NOT NULL CHECK(environment IN ('test','live')),
 payout_fee_bearer varchar(8) NOT NULL CHECK(payout_fee_bearer IN ('platform','merchant')),
 provider_reference varchar(100) NOT NULL UNIQUE, amount_minor bigint NOT NULL CHECK(amount_minor>=0), recovered_minor bigint NOT NULL DEFAULT 0 CHECK(recovered_minor>=0),
 state varchar(16) NOT NULL DEFAULT 'approved' CHECK(state IN ('approved','submitting','pending','otp','succeeded','failed','reversed','uncertain','recovered')),
 transfer_code varchar(100), created_by varchar(255) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(business_id,request_key), CHECK(amount_minor>0 OR state='recovered')
);
CREATE INDEX settlement_batches_business_idx ON settlement_batches(business_id,created_at DESC,id DESC);
CREATE TABLE settlement_items (
 batch_id uuid NOT NULL REFERENCES settlement_batches(id), intent_id uuid NOT NULL REFERENCES payment_intents(id),
 amount_minor bigint NOT NULL CHECK(amount_minor>0), PRIMARY KEY(batch_id,intent_id)
);
CREATE TRIGGER settlement_items_immutable BEFORE UPDATE OR DELETE ON settlement_items FOR EACH ROW EXECUTE FUNCTION m5_immutable_record();
CREATE TABLE settlement_claims (
 intent_id uuid PRIMARY KEY REFERENCES payment_intents(id), batch_id uuid NOT NULL REFERENCES settlement_batches(id)
);
CREATE TABLE settlement_fees (
 batch_id uuid PRIMARY KEY REFERENCES settlement_batches(id), amount_minor bigint NOT NULL CHECK(amount_minor>=0)
);
CREATE TABLE settlement_fee_returns (
 batch_id uuid PRIMARY KEY REFERENCES settlement_batches(id), amount_minor bigint NOT NULL CHECK(amount_minor>=0)
);
CREATE TRIGGER settlement_fees_immutable BEFORE UPDATE OR DELETE ON settlement_fees FOR EACH ROW EXECUTE FUNCTION m5_immutable_record();
CREATE TRIGGER settlement_fee_returns_immutable BEFORE UPDATE OR DELETE ON settlement_fee_returns FOR EACH ROW EXECUTE FUNCTION m5_immutable_record();
CREATE TABLE finance_disputes (
 provider_id varchar(100) PRIMARY KEY, intent_id uuid NOT NULL REFERENCES payment_intents(id),
 amount_minor bigint NOT NULL CHECK(amount_minor>0), state varchar(12) NOT NULL CHECK(state IN ('open','won','lost')),
 funding jsonb NOT NULL, resolution varchar(80), resolved_amount_minor bigint CHECK(resolved_amount_minor>=0 AND resolved_amount_minor<=amount_minor), resolved_funding jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX finance_disputes_intent_idx ON finance_disputes(intent_id,state);
CREATE TABLE finance_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind varchar(32) NOT NULL,
 resource_id varchar(100) NOT NULL, state varchar(10) NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','done','dead')),
 attempts integer NOT NULL DEFAULT 0, next_at timestamptz NOT NULL DEFAULT now(),
 lease_id uuid, lease_until timestamptz, last_error varchar(80), UNIQUE(kind,resource_id)
);
CREATE INDEX finance_jobs_ready_idx ON finance_jobs(next_at,id) WHERE state IN ('queued','running');
CREATE TABLE finance_consumed_events (
 event_id uuid PRIMARY KEY REFERENCES outbox_events(id), consumed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER finance_consumed_events_immutable BEFORE UPDATE OR DELETE ON finance_consumed_events FOR EACH ROW EXECUTE FUNCTION m5_immutable_record();
CREATE TABLE finance_operation_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), resource_type varchar(24) NOT NULL, resource_id varchar(100) NOT NULL,
 action varchar(80) NOT NULL, actor varchar(255) NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX finance_operation_events_created_idx ON finance_operation_events(created_at DESC,id DESC);
CREATE INDEX outbox_finance_consumer_idx ON outbox_events(created_at,id) WHERE event_type IN ('payment.verified','business.order.fulfilled','business.reservation.completed','business.order.cancelled','business.reservation.cancelled');
CREATE TRIGGER finance_operation_events_immutable BEFORE UPDATE OR DELETE ON finance_operation_events FOR EACH ROW EXECUTE FUNCTION m5_immutable_record();
-- Freeze obligation identity and pricing. Provider states evolve through audited compensating operations.
CREATE FUNCTION m5_obligation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Financial obligations cannot be deleted'; END IF;
 IF TG_TABLE_NAME='payment_terms' THEN
  IF ROW(NEW.intent_id,NEW.policy_id,NEW.commission_minor,NEW.merchant_minor) IS DISTINCT FROM ROW(OLD.intent_id,OLD.policy_id,OLD.commission_minor,OLD.merchant_minor) THEN RAISE EXCEPTION 'Payment terms are immutable'; END IF;
 ELSIF TG_TABLE_NAME='finance_refunds' THEN
  IF ROW(NEW.intent_id,NEW.request_key,NEW.amount_minor,NEW.reason,NEW.created_by,NEW.created_at) IS DISTINCT FROM ROW(OLD.intent_id,OLD.request_key,OLD.amount_minor,OLD.reason,OLD.created_by,OLD.created_at) THEN RAISE EXCEPTION 'Refund obligation is immutable'; END IF;
  IF OLD.funding IS NOT NULL AND NEW.funding IS DISTINCT FROM OLD.funding THEN RAISE EXCEPTION 'M5: Reserved funding is immutable'; END IF;
  IF OLD.provider_id IS NOT NULL AND NEW.provider_id IS DISTINCT FROM OLD.provider_id THEN RAISE EXCEPTION 'M5: Refund provider identity is immutable'; END IF;
  IF OLD.external IS DISTINCT FROM NEW.external OR (OLD.state IN ('processed','failed','rejected') AND NEW.state<>OLD.state) THEN RAISE EXCEPTION 'M5: Refund terminal state is immutable'; END IF;
 ELSIF TG_TABLE_NAME='settlement_batches' THEN
  IF ROW(NEW.business_id,NEW.request_key,NEW.recipient_id,NEW.recipient_code,NEW.environment,NEW.provider_reference,NEW.amount_minor,NEW.recovered_minor,NEW.payout_fee_bearer,NEW.created_by,NEW.created_at) IS DISTINCT FROM ROW(OLD.business_id,OLD.request_key,OLD.recipient_id,OLD.recipient_code,OLD.environment,OLD.provider_reference,OLD.amount_minor,OLD.recovered_minor,OLD.payout_fee_bearer,OLD.created_by,OLD.created_at) THEN RAISE EXCEPTION 'Payout obligation is immutable'; END IF;
  IF OLD.transfer_code IS NOT NULL AND NEW.transfer_code IS DISTINCT FROM OLD.transfer_code THEN RAISE EXCEPTION 'M5: Transfer identity is immutable'; END IF;
  IF (OLD.state IN ('failed','reversed','recovered') AND NEW.state<>OLD.state) OR (OLD.state='succeeded' AND NEW.state NOT IN ('succeeded','reversed')) THEN RAISE EXCEPTION 'M5: Illegal payout regression'; END IF;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER payment_terms_guard BEFORE UPDATE OR DELETE ON payment_terms FOR EACH ROW EXECUTE FUNCTION m5_obligation_guard();
CREATE TRIGGER finance_refunds_guard BEFORE UPDATE OR DELETE ON finance_refunds FOR EACH ROW EXECUTE FUNCTION m5_obligation_guard();
CREATE TRIGGER settlement_batches_guard BEFORE UPDATE OR DELETE ON settlement_batches FOR EACH ROW EXECUTE FUNCTION m5_obligation_guard();
CREATE FUNCTION m5_recipient_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'M5: Recipient history is immutable'; END IF;
 IF ROW(NEW.id,NEW.business_id,NEW.recipient_code,NEW.environment,NEW.verified_by,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.business_id,OLD.recipient_code,OLD.environment,OLD.verified_by,OLD.created_at)
 THEN RAISE EXCEPTION 'M5: Recipient identity is immutable'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER merchant_recipients_guard BEFORE UPDATE OR DELETE ON merchant_recipients FOR EACH ROW EXECUTE FUNCTION m5_recipient_guard();
CREATE FUNCTION m5_terms_scope() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM payment_intents p JOIN finance_policies f ON f.business_id=p.business_id WHERE p.id=NEW.intent_id AND f.id=NEW.policy_id AND NEW.commission_minor+NEW.merchant_minor=p.amount_minor AND NEW.commission_minor=floor(p.amount_minor::numeric*f.commission_bps/10000))
 THEN RAISE EXCEPTION 'M5: Financial terms do not match capture and policy'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER payment_terms_scope BEFORE INSERT ON payment_terms FOR EACH ROW EXECUTE FUNCTION m5_terms_scope();
CREATE FUNCTION m5_hold_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p payment_intents%ROWTYPE;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'M5: Hold history is immutable'; END IF;
 IF TG_OP='INSERT' THEN
  SELECT * INTO p FROM payment_intents WHERE id=NEW.intent_id;
  IF p.customer_subject<>NEW.customer_subject OR p.business_id<>NEW.business_id OR NOT EXISTS(SELECT 1 FROM payment_terms WHERE intent_id=p.id)
  THEN RAISE EXCEPTION 'M5: Hold payment ownership mismatch'; END IF;
 ELSE
  IF ROW(NEW.id,NEW.intent_id,NEW.customer_subject,NEW.business_id,NEW.branch_id,NEW.catalogue_id,NEW.kind,NEW.availability_id,NEW.quantity,NEW.guest_name,NEW.request_key,NEW.expires_at,NEW.key_id)
   IS DISTINCT FROM ROW(OLD.id,OLD.intent_id,OLD.customer_subject,OLD.business_id,OLD.branch_id,OLD.catalogue_id,OLD.kind,OLD.availability_id,OLD.quantity,OLD.guest_name,OLD.request_key,OLD.expires_at,OLD.key_id)
  THEN RAISE EXCEPTION 'M5: Hold purchase snapshot is immutable'; END IF;
  IF OLD.status<>NEW.status AND NOT ((OLD.status='held' AND NEW.status IN ('confirmed','expired','cancelled','late')) OR (OLD.status='confirmed' AND NEW.status='cancelled'))
  THEN RAISE EXCEPTION 'M5: Illegal hold transition'; END IF;
 END IF;
 IF NEW.status='confirmed' AND NOT EXISTS(SELECT 1 FROM payment_intents WHERE id=NEW.intent_id AND status='succeeded')
 THEN RAISE EXCEPTION 'M5: Unverified hold confirmation'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER paid_holds_guard BEFORE INSERT OR UPDATE OR DELETE ON paid_holds FOR EACH ROW EXECUTE FUNCTION m5_hold_guard();
CREATE FUNCTION m5_ticket_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'M5: Ticket history is immutable'; END IF;
 IF ROW(NEW.id,NEW.hold_id,NEW.ordinal,NEW.nonce,NEW.key_id) IS DISTINCT FROM ROW(OLD.id,OLD.hold_id,OLD.ordinal,OLD.nonce,OLD.key_id)
 OR (OLD.state<>NEW.state AND NOT (OLD.state='issued' AND NEW.state IN ('redeemed','revoked')))
 OR (OLD.state='redeemed' AND ROW(NEW.redeemed_at,NEW.redeemed_by) IS DISTINCT FROM ROW(OLD.redeemed_at,OLD.redeemed_by))
 THEN RAISE EXCEPTION 'M5: Ticket identity or redemption is immutable'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER issued_tickets_guard BEFORE UPDATE OR DELETE ON issued_tickets FOR EACH ROW EXECUTE FUNCTION m5_ticket_guard();
CREATE FUNCTION m5_event_inventory_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE inventory ticket_inventory%ROWTYPE;
BEGIN
 SELECT * INTO inventory FROM ticket_inventory WHERE catalogue_id=OLD.catalogue_id FOR SHARE;
 IF inventory.capacity>NEW.max_guests OR (EXISTS(SELECT 1 FROM paid_holds WHERE catalogue_id=OLD.catalogue_id) AND ROW(NEW.starts_at,NEW.ends_at) IS DISTINCT FROM ROW(OLD.starts_at,OLD.ends_at))
 THEN RAISE EXCEPTION 'M5: Event inventory or schedule is already committed'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER business_event_inventory_guard BEFORE UPDATE ON business_event_config FOR EACH ROW EXECUTE FUNCTION m5_event_inventory_guard();
CREATE FUNCTION m5_availability_snapshot_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF ROW(NEW.business_id,NEW.branch_id,NEW.catalogue_id,NEW.starts_at,NEW.ends_at) IS DISTINCT FROM ROW(OLD.business_id,OLD.branch_id,OLD.catalogue_id,OLD.starts_at,OLD.ends_at)
 AND EXISTS(SELECT 1 FROM paid_holds WHERE availability_id=OLD.id)
 THEN RAISE EXCEPTION 'M5: Paid availability snapshot is immutable'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER business_availability_paid_snapshot BEFORE UPDATE ON business_availability FOR EACH ROW EXECUTE FUNCTION m5_availability_snapshot_guard();
REVOKE ALL ON finance_policies,payment_terms,checkout_sessions,ticket_inventory,paid_holds,issued_tickets,finance_postings,
 finance_all_postings,finance_refunds,merchant_recipients,settlement_batches,settlement_items,settlement_claims,
 finance_disputes,finance_jobs,finance_consumed_events,finance_operation_events,payment_fees,finance_reconciliation_cases,finance_account_owners,payment_order_attempts,payment_order_current,finance_order_links,finance_environment,settlement_fees,settlement_fee_returns FROM PUBLIC;
