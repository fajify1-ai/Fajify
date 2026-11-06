-- M7-P1 quote binding and replay constraints.
CREATE TABLE IF NOT EXISTS ride_fare_quotes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_subject varchar(255) NOT NULL REFERENCES user_profiles(identity_subject),
 pickup geography(Point,4326) NOT NULL,
 destination geography(Point,4326) NOT NULL,
 category varchar(32) NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor >= 0),
 currency char(3) NOT NULL DEFAULT 'NGN',
 expires_at timestamptz NOT NULL,
 pricing_version varchar(40) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ride_fare_quotes_expiry_idx ON ride_fare_quotes(expires_at);
ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES ride_fare_quotes(id);
CREATE UNIQUE INDEX IF NOT EXISTS ride_one_request_per_quote_idx ON ride_requests(quote_id) WHERE quote_id IS NOT NULL;
