-- M7-P1: policy snapshots, M5 verified-payment linkage and driver settlement exposure.
ALTER TABLE ride_fare_quotes ADD COLUMN IF NOT EXISTS commission_bps integer NOT NULL DEFAULT 0 CHECK(commission_bps BETWEEN 0 AND 10000);
CREATE TABLE IF NOT EXISTS ride_payment_links (
 ride_id uuid PRIMARY KEY REFERENCES ride_requests(id),
 intent_id uuid NOT NULL UNIQUE REFERENCES payment_intents(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ride_driver_payouts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 ride_id uuid NOT NULL UNIQUE REFERENCES ride_requests(id),
 driver_id uuid NOT NULL REFERENCES ride_drivers(id),
 recipient_ref varchar(160) NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0),
 currency char(3) NOT NULL DEFAULT 'NGN',
 provider_reference varchar(100) NOT NULL UNIQUE,
 state varchar(24) NOT NULL DEFAULT 'reserved' CHECK(state IN ('reserved','submitting','uncertain','confirmed','reconciled','failed')),
 provider_id varchar(120),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ride_driver_payouts_state_idx ON ride_driver_payouts(state,created_at);
