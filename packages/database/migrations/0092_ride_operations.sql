-- M7-P1 operational controls and dispatch generation fencing.
CREATE TABLE IF NOT EXISTS ride_dispatch_areas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name varchar(120) NOT NULL UNIQUE,
 boundary geometry(MultiPolygon,4326) NOT NULL,
 active boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ST_IsValid(boundary)),
 CHECK(NOT ST_IsEmpty(boundary))
);
CREATE INDEX IF NOT EXISTS ride_dispatch_areas_boundary_idx ON ride_dispatch_areas USING gist(boundary);
ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS dispatch_generation bigint NOT NULL DEFAULT 0 CHECK(dispatch_generation>=0);
ALTER TABLE ride_dispatch_offers ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES ride_dispatch_areas(id);
CREATE INDEX IF NOT EXISTS ride_dispatch_offers_area_idx ON ride_dispatch_offers(area_id,expires_at);
ALTER TABLE ride_driver_documents ADD CONSTRAINT ride_driver_document_key_nonempty CHECK(length(private_object_key)>0);
CREATE TABLE IF NOT EXISTS ride_driver_bank_refs (
 driver_id uuid PRIMARY KEY REFERENCES ride_drivers(id),
 payout_recipient_ref varchar(160) NOT NULL,
 verified boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ride_incidents ADD COLUMN IF NOT EXISTS severity varchar(12) NOT NULL DEFAULT 'normal'
 CHECK(severity IN ('normal','urgent','emergency'));
ALTER TABLE ride_incidents ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
CREATE INDEX IF NOT EXISTS ride_incident_open_idx ON ride_incidents(status,created_at) WHERE status<>'resolved';
CREATE TABLE IF NOT EXISTS ride_fares (
 ride_id uuid PRIMARY KEY REFERENCES ride_requests(id),
 gross_minor bigint NOT NULL CHECK(gross_minor>=0),
 commission_minor bigint NOT NULL CHECK(commission_minor>=0),
 driver_minor bigint NOT NULL CHECK(driver_minor>=0),
 commission_bps integer NOT NULL CHECK(commission_bps BETWEEN 0 AND 10000),
 currency char(3) NOT NULL DEFAULT 'NGN',
 payment_intent_id uuid UNIQUE REFERENCES payment_intents(id),
 payment_state varchar(20) NOT NULL DEFAULT 'unpaid' CHECK(payment_state IN ('unpaid','verified','refunded','disputed')),
 settlement_state varchar(20) NOT NULL DEFAULT 'blocked' CHECK(settlement_state IN ('blocked','eligible','submitted','paid','reconciled')),
 verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(gross_minor=commission_minor+driver_minor),
 CHECK((payment_state='verified' AND verified_at IS NOT NULL) OR (payment_state<>'verified')),
 CHECK((settlement_state='blocked') OR payment_state='verified')
);
CREATE TABLE IF NOT EXISTS ride_financial_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 ride_id uuid NOT NULL REFERENCES ride_requests(id),
 actor_subject varchar(255) NOT NULL,
 event_type varchar(60) NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>=0),
 occurred_at timestamptz NOT NULL DEFAULT now(),
 idempotency_key varchar(128) NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS ride_financial_events_ride_idx ON ride_financial_events(ride_id,occurred_at);
-- Prevent old/expired accepted rows from falsely being counted as assignments.
-- The request is the single source of truth. Offer status is an immutable history signal.
