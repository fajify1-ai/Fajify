-- M5-P1 increment 1. 0010 is reserved for the parallel M4 customer migration.
-- Amounts are integer minor units; no client success callback grants value.
CREATE TABLE payment_intents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_subject varchar(255) NOT NULL CHECK(length(btrim(customer_subject))>0),
 business_id uuid NOT NULL REFERENCES business_onboarding(id),
 request_key varchar(100) NOT NULL CHECK(request_key ~ '^[A-Za-z0-9_-]{8,100}$'),
 provider varchar(16) NOT NULL DEFAULT 'paystack' CHECK(provider='paystack'),
 provider_reference varchar(100) NOT NULL UNIQUE CHECK(provider_reference ~ '^[A-Za-z0-9_-]{8,100}$'),
 environment varchar(4) NOT NULL CHECK(environment IN ('test','live')),
 amount_minor bigint NOT NULL CHECK(amount_minor BETWEEN 1 AND 9007199254740991),
 currency varchar(3) NOT NULL CHECK(currency='NGN'),
 status varchar(16) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','succeeded')),
 verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(customer_subject,request_key),
 CHECK((status='succeeded')=(verified_at IS NOT NULL))
);
CREATE TABLE payment_receipts (
 intent_id uuid PRIMARY KEY REFERENCES payment_intents(id),
 provider_transaction_id varchar(100) NOT NULL UNIQUE,
 payload_sha256 char(64) NOT NULL CHECK(payload_sha256 ~ '^[a-f0-9]{64}$'),
 verified_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE ledger_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code varchar(80) NOT NULL,
 currency varchar(3) NOT NULL CHECK(currency='NGN'),
 UNIQUE(code,currency),
 UNIQUE(id,currency)
);
INSERT INTO ledger_accounts(code,currency) VALUES ('gateway_clearing','NGN'),('customer_funds','NGN');
-- Each row is a balanced journal transfer: one debit and one equal credit.
-- Explicit account/currency FKs prevent cross-currency journals. Reversals use new rows.
CREATE TABLE ledger_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 intent_id uuid NOT NULL UNIQUE REFERENCES payment_receipts(intent_id),
 debit_account_id uuid NOT NULL,
 credit_account_id uuid NOT NULL,
 currency varchar(3) NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor BETWEEN 1 AND 9007199254740991),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(debit_account_id<>credit_account_id),
 FOREIGN KEY(debit_account_id,currency) REFERENCES ledger_accounts(id,currency),
 FOREIGN KEY(credit_account_id,currency) REFERENCES ledger_accounts(id,currency)
);
CREATE FUNCTION m5_immutable_record() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Finance history is append-only'; END;
$$;
CREATE TRIGGER payment_receipts_immutable BEFORE UPDATE OR DELETE ON payment_receipts FOR EACH ROW EXECUTE FUNCTION m5_immutable_record();
CREATE TRIGGER ledger_entries_immutable BEFORE UPDATE OR DELETE ON ledger_entries FOR EACH ROW EXECUTE FUNCTION m5_immutable_record();
CREATE TRIGGER ledger_accounts_immutable BEFORE UPDATE OR DELETE ON ledger_accounts FOR EACH ROW EXECUTE FUNCTION m5_immutable_record();
CREATE FUNCTION m5_guard_intent() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Payment intent history is immutable'; END IF;
 IF OLD.status='succeeded' OR ROW(NEW.id,NEW.customer_subject,NEW.business_id,NEW.request_key,NEW.provider,NEW.provider_reference,NEW.environment,NEW.amount_minor,NEW.currency,NEW.created_at)
 IS DISTINCT FROM ROW(OLD.id,OLD.customer_subject,OLD.business_id,OLD.request_key,OLD.provider,OLD.provider_reference,OLD.environment,OLD.amount_minor,OLD.currency,OLD.created_at)
 THEN RAISE EXCEPTION 'Payment intent fields are immutable'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER payment_intents_guard BEFORE UPDATE OR DELETE ON payment_intents FOR EACH ROW EXECUTE FUNCTION m5_guard_intent();
-- Completion, receipt and journal must agree at commit, including writes outside the API.
CREATE FUNCTION m5_check_posting() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; payment payment_intents%ROWTYPE; receipt_count integer; journal_count integer;
BEGIN
 IF TG_TABLE_NAME='payment_intents' THEN target:=NEW.id; ELSE target:=NEW.intent_id; END IF;
 SELECT * INTO payment FROM payment_intents WHERE id=target;
 SELECT count(*) INTO receipt_count FROM payment_receipts WHERE intent_id=target;
 SELECT count(*) INTO journal_count FROM ledger_entries WHERE intent_id=target AND amount_minor=payment.amount_minor AND currency=payment.currency;
 IF (payment.status='succeeded' AND (receipt_count<>1 OR journal_count<>1))
 OR (payment.status='pending' AND (receipt_count<>0 OR journal_count<>0)) THEN
  RAISE EXCEPTION 'Payment, receipt and balanced journal must reconcile';
 END IF;
 RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER payment_intents_reconcile AFTER INSERT OR UPDATE ON payment_intents DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION m5_check_posting();
CREATE CONSTRAINT TRIGGER payment_receipts_reconcile AFTER INSERT ON payment_receipts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION m5_check_posting();
CREATE CONSTRAINT TRIGGER ledger_entries_reconcile AFTER INSERT ON ledger_entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION m5_check_posting();
CREATE INDEX payment_intents_customer_idx ON payment_intents(customer_subject,created_at DESC);
CREATE INDEX payment_capture_audit_idx ON audit_events(resource_id)
 WHERE resource_type='payment_intent' AND action='payment.verified';
CREATE INDEX payment_capture_outbox_idx ON outbox_events((payload::jsonb->>'paymentIntentId'))
 WHERE event_type='payment.verified';
REVOKE ALL ON payment_intents,payment_receipts,ledger_accounts,ledger_entries FROM PUBLIC;
