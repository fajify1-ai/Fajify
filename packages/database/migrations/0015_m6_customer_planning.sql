-- M6-P1: private customer planning records. Additive migration; no existing rows changed.
CREATE TABLE customer_plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_subject varchar(255) NOT NULL REFERENCES user_profiles(identity_subject),
 occasion varchar(80) NOT NULL CHECK(length(trim(occasion))>0),
 budget_minor bigint NOT NULL CHECK(budget_minor>=0),
 currency varchar(3) NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
 guests integer NOT NULL CHECK(guests BETWEEN 1 AND 100),
 starts_after timestamptz NOT NULL,
 starts_before timestamptz NOT NULL,
 location_text varchar(120),
 categories text[] NOT NULL DEFAULT '{}',
 status varchar(16) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','archived')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(starts_before>starts_after),
 CHECK(cardinality(categories)<=8)
);
CREATE INDEX customer_plans_owner_history_idx ON customer_plans(customer_subject,created_at DESC,id DESC);
CREATE INDEX customer_plans_active_idx ON customer_plans(customer_subject,id) WHERE status='draft';
