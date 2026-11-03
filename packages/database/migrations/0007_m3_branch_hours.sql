-- M3-P1: weekly operating hours, per approved merchant branch.
-- Minute offsets allow exact local windows without implicit server timezone conversion.
CREATE TABLE business_branch_hours (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL,
 branch_id uuid NOT NULL,
 weekday smallint NOT NULL CHECK(weekday BETWEEN 0 AND 6),
 opens_minute smallint NOT NULL CHECK(opens_minute BETWEEN 0 AND 1439),
 closes_minute smallint NOT NULL CHECK(closes_minute BETWEEN 1 AND 1440),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(opens_minute < closes_minute),
 UNIQUE(branch_id,weekday,opens_minute,closes_minute),
 FOREIGN KEY(branch_id,business_id) REFERENCES business_branches(id,business_id)
);
CREATE INDEX business_branch_hours_idx ON business_branch_hours(business_id,branch_id,weekday);
REVOKE ALL ON business_branch_hours FROM PUBLIC;
