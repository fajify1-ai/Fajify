-- Additive M4-P1 integration with the existing merchant inbox and status machine.
ALTER TABLE business_reservations ADD COLUMN guest_name varchar(120);
ALTER TABLE business_reservations ADD CONSTRAINT business_reservation_guest_name_check
 CHECK(guest_name IS NULL OR length(btrim(guest_name)) BETWEEN 1 AND 120);
CREATE INDEX customer_reservations_history_idx ON business_reservations(customer_subject,created_at DESC,id DESC);
CREATE INDEX customer_orders_history_idx ON business_orders(customer_subject,created_at DESC,id DESC);
-- Global per-customer retry records span both branch and merchant boundaries.
-- Existing M3 keys remain independent and unchanged.
CREATE TABLE customer_request_keys (
 customer_subject varchar(255) NOT NULL REFERENCES user_profiles(identity_subject),
 operation varchar(16) NOT NULL CHECK(operation IN ('reservation','order')),
 request_key varchar(100) NOT NULL CHECK(request_key ~ '^[A-Za-z0-9_-]{8,100}$'),
 fingerprint char(64) NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
 resource_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(customer_subject,operation,request_key)
);
REVOKE ALL ON customer_request_keys FROM PUBLIC;
