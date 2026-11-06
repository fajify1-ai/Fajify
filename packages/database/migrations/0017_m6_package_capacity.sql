-- Component capacity is reserved alongside M5's existing package availability hold.
-- No changes to payment confirmation semantics; M5 remains authoritative.
CREATE TABLE package_component_holds (
 hold_id uuid NOT NULL REFERENCES paid_holds(id),
 availability_id uuid NOT NULL REFERENCES business_availability(id),
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 100000),
 released_at timestamptz,
 PRIMARY KEY(hold_id,availability_id)
);
CREATE INDEX package_component_holds_slot_active_idx ON package_component_holds(availability_id) WHERE released_at IS NULL;
REVOKE ALL ON package_component_holds FROM PUBLIC;
