-- M7-P1: durable ride/dispatch foundation. Safe only on a disposable or reviewed target.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE IF NOT EXISTS ride_drivers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 identity_subject varchar(255) NOT NULL UNIQUE REFERENCES user_profiles(identity_subject),
 status varchar(24) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','suspended')),
 available boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ride_vehicles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 driver_id uuid NOT NULL REFERENCES ride_drivers(id),
 category varchar(32) NOT NULL CHECK(length(category)>0),
 registration varchar(40) NOT NULL UNIQUE,
 approved boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ride_driver_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 driver_id uuid NOT NULL REFERENCES ride_drivers(id),
 document_kind varchar(40) NOT NULL,
 private_object_key text NOT NULL,
 review_status varchar(20) NOT NULL DEFAULT 'pending' CHECK(review_status IN ('pending','approved','rejected')),
 expires_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(driver_id,document_kind)
);
CREATE TABLE IF NOT EXISTS ride_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_subject varchar(255) NOT NULL REFERENCES user_profiles(identity_subject),
 pickup geography(Point,4326) NOT NULL,
 destination geography(Point,4326) NOT NULL,
 category varchar(32) NOT NULL,
 quote_amount_minor bigint NOT NULL CHECK(quote_amount_minor>=0),
 currency char(3) NOT NULL DEFAULT 'NGN',
 quote_expires_at timestamptz NOT NULL,
 idempotency_key varchar(120) NOT NULL,
 status varchar(24) NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','offered','assigned','driver_arriving','driver_arrived','in_progress','completed','cancelled')),
 assigned_driver_id uuid REFERENCES ride_drivers(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(customer_subject,idempotency_key),
 CHECK (assigned_driver_id IS NULL OR status IN ('assigned','driver_arriving','driver_arrived','in_progress','completed'))
);
CREATE UNIQUE INDEX IF NOT EXISTS ride_driver_one_active_assignment
 ON ride_requests(assigned_driver_id) WHERE assigned_driver_id IS NOT NULL AND status IN ('assigned','driver_arriving','driver_arrived','in_progress');
CREATE INDEX IF NOT EXISTS ride_request_customer_idx ON ride_requests(customer_subject,created_at DESC);
CREATE INDEX IF NOT EXISTS ride_request_pickup_geo_idx ON ride_requests USING gist(pickup);
CREATE TABLE IF NOT EXISTS ride_dispatch_offers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 ride_id uuid NOT NULL REFERENCES ride_requests(id),
 driver_id uuid NOT NULL REFERENCES ride_drivers(id),
 status varchar(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','expired','rejected','revoked')),
 expires_at timestamptz NOT NULL,
 fence_version bigint NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(ride_id,driver_id,fence_version)
);
CREATE UNIQUE INDEX IF NOT EXISTS ride_one_accepted_offer ON ride_dispatch_offers(ride_id) WHERE status='accepted';
CREATE INDEX IF NOT EXISTS ride_offers_pending_idx ON ride_dispatch_offers(expires_at) WHERE status='pending';
CREATE TABLE IF NOT EXISTS ride_driver_locations (
 driver_id uuid PRIMARY KEY REFERENCES ride_drivers(id),
 position geography(Point,4326) NOT NULL,
 observed_at timestamptz NOT NULL,
 sequence bigint NOT NULL CHECK(sequence>=0),
 consent_granted boolean NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ride_driver_locations_geo_idx ON ride_driver_locations USING gist(position);
CREATE TABLE IF NOT EXISTS ride_trip_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 ride_id uuid NOT NULL REFERENCES ride_requests(id),
 actor_subject varchar(255) NOT NULL,
 from_state varchar(24) NOT NULL,
 to_state varchar(24) NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ride_trip_events_ride_idx ON ride_trip_events(ride_id,occurred_at);
CREATE TABLE IF NOT EXISTS ride_incidents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 ride_id uuid NOT NULL REFERENCES ride_requests(id),
 reporter_subject varchar(255) NOT NULL,
 kind varchar(40) NOT NULL,
 status varchar(20) NOT NULL DEFAULT 'open' CHECK(status IN ('open','investigating','resolved')),
 created_at timestamptz NOT NULL DEFAULT now()
);
