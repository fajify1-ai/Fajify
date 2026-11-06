-- Category-specific ride tariff policies.
CREATE TABLE IF NOT EXISTS ride_tariff_policies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 category varchar(32) NOT NULL,
 version integer NOT NULL CHECK(version>=1),
 base_minor bigint NOT NULL CHECK(base_minor>=0),
 per_km_minor bigint NOT NULL CHECK(per_km_minor>=0),
 commission_bps integer NOT NULL CHECK(commission_bps BETWEEN 0 AND 10000),
 approved_by varchar(255) NOT NULL,
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(category,version),
 CHECK(base_minor>0 OR per_km_minor>0)
);
CREATE UNIQUE INDEX IF NOT EXISTS ride_one_active_tariff_idx ON ride_tariff_policies(category) WHERE active;
CREATE INDEX IF NOT EXISTS ride_tariff_history_idx ON ride_tariff_policies(category,version DESC);
ALTER TABLE ride_fare_quotes ADD COLUMN IF NOT EXISTS policy_id uuid REFERENCES ride_tariff_policies(id);
