-- M3-P1: merchant operations. The M2 approval record remains the tenant root.
CREATE TABLE business_branches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES business_onboarding(id) ON DELETE RESTRICT,
 name varchar(120) NOT NULL CHECK(length(btrim(name)) BETWEEN 2 AND 120),
 contact_email varchar(254),
 address text,
 timezone varchar(64) NOT NULL DEFAULT 'Africa/Lagos',
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,business_id)
);
CREATE INDEX business_branches_business_idx ON business_branches(business_id);
CREATE TABLE business_catalogue (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES business_onboarding(id) ON DELETE RESTRICT,
 branch_id uuid NOT NULL,
 name varchar(160) NOT NULL CHECK(length(btrim(name)) BETWEEN 2 AND 160),
 description text,
 kind varchar(16) NOT NULL CHECK(kind IN ('product','service','package','event')),
 price_minor bigint NOT NULL CHECK(price_minor>=0),
 currency char(3) NOT NULL DEFAULT 'NGN' CHECK(currency ~ '^[A-Z]{3}$'),
 published boolean NOT NULL DEFAULT false,
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,business_id,branch_id),
 FOREIGN KEY(branch_id,business_id) REFERENCES business_branches(id,business_id)
);
CREATE INDEX business_catalogue_branch_idx ON business_catalogue(business_id,branch_id) WHERE active;
CREATE TABLE business_availability (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES business_onboarding(id) ON DELETE RESTRICT,
 branch_id uuid NOT NULL,
 catalogue_id uuid NOT NULL,
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL,
 capacity integer NOT NULL CHECK(capacity>0),
 reserved integer NOT NULL DEFAULT 0 CHECK(reserved>=0 AND reserved<=capacity),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ends_at>starts_at),
 UNIQUE(id,business_id,branch_id),
 FOREIGN KEY(branch_id,business_id) REFERENCES business_branches(id,business_id),
 FOREIGN KEY(catalogue_id,business_id,branch_id) REFERENCES business_catalogue(id,business_id,branch_id)
);
CREATE INDEX business_availability_lookup_idx ON business_availability(business_id,branch_id,starts_at);
CREATE TABLE business_reservations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES business_onboarding(id) ON DELETE RESTRICT,
 branch_id uuid NOT NULL,
 availability_id uuid NOT NULL,
 customer_subject varchar(255) NOT NULL,
 guests integer NOT NULL CHECK(guests>0),
 status varchar(16) NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','checked_in','completed','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(availability_id,business_id,branch_id) REFERENCES business_availability(id,business_id,branch_id)
);
CREATE INDEX business_reservations_scope_idx ON business_reservations(business_id,branch_id,created_at DESC);
CREATE TABLE business_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES business_onboarding(id) ON DELETE RESTRICT,
 branch_id uuid NOT NULL,
 customer_subject varchar(255) NOT NULL,
 status varchar(16) NOT NULL DEFAULT 'placed' CHECK(status IN ('placed','accepted','preparing','ready','fulfilled','cancelled')),
 total_minor bigint NOT NULL CHECK(total_minor>=0),
 currency char(3) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,business_id,branch_id),
 FOREIGN KEY(branch_id,business_id) REFERENCES business_branches(id,business_id)
);
CREATE TABLE business_order_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL,
 branch_id uuid NOT NULL,
 order_id uuid NOT NULL,
 catalogue_id uuid NOT NULL,
 quantity integer NOT NULL CHECK(quantity>0),
 unit_price_minor bigint NOT NULL CHECK(unit_price_minor>=0),
 FOREIGN KEY(order_id,business_id,branch_id) REFERENCES business_orders(id,business_id,branch_id),
 FOREIGN KEY(catalogue_id,business_id,branch_id) REFERENCES business_catalogue(id,business_id,branch_id)
);
CREATE INDEX business_orders_scope_idx ON business_orders(business_id,branch_id,created_at DESC);
REVOKE ALL ON business_branches,business_catalogue,business_availability,business_reservations,business_orders,business_order_items FROM PUBLIC;
