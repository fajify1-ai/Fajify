-- M8-P1 customer-consented booking-to-ride association, AFTER accepted M7 (0090–0101).
-- A link never requests, pays for, dispatches or cancels a ride.
CREATE TABLE customer_booking_ride_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_subject varchar(255) NOT NULL REFERENCES user_profiles(identity_subject),
 reservation_id uuid NOT NULL REFERENCES business_reservations(id),
 ride_id uuid NOT NULL REFERENCES ride_requests(id),
 request_key varchar(100) NOT NULL CHECK(request_key ~ '^[A-Za-z0-9_-]{8,100}$'),
 status varchar(12) NOT NULL DEFAULT 'active' CHECK(status IN ('active','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),
 cancelled_at timestamptz,
 CHECK((status='cancelled')=(cancelled_at IS NOT NULL)),
 UNIQUE(customer_subject,request_key)
);
CREATE UNIQUE INDEX customer_booking_active_reservation_idx
 ON customer_booking_ride_links(reservation_id) WHERE status='active';
CREATE UNIQUE INDEX customer_booking_active_ride_idx
 ON customer_booking_ride_links(ride_id) WHERE status='active';
CREATE INDEX customer_booking_ride_history_idx
 ON customer_booking_ride_links(customer_subject,created_at DESC,id DESC);

-- Database-enforced dual ownership and physical venue destination.
-- Rebooking after a cancellation creates a new immutable association.
CREATE FUNCTION m8_booking_ride_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'M8: booking/ride links cannot be deleted'; END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.customer_subject IS DISTINCT FROM OLD.customer_subject
   OR NEW.reservation_id IS DISTINCT FROM OLD.reservation_id OR NEW.ride_id IS DISTINCT FROM OLD.ride_id
   OR NEW.request_key IS DISTINCT FROM OLD.request_key OR NEW.created_at IS DISTINCT FROM OLD.created_at
   OR OLD.status<>'active' OR NEW.status<>'cancelled' OR NEW.cancelled_at IS NULL
  THEN RAISE EXCEPTION 'M8: booking/ride link identity and history cannot change'; END IF;
  RETURN NEW;
 END IF;
 IF NEW.status<>'active' OR NEW.cancelled_at IS NOT NULL THEN
  RAISE EXCEPTION 'M8: only an active link may be created'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM business_reservations r
  JOIN business_branches branch ON branch.id=r.branch_id AND branch.business_id=r.business_id AND branch.active
  JOIN business_onboarding merchant ON merchant.id=r.business_id AND merchant.status='approved'
  JOIN business_public_profiles venue ON venue.branch_id=r.branch_id AND venue.business_id=r.business_id
  JOIN ride_requests ride ON ride.id=NEW.ride_id AND ride.customer_subject=NEW.customer_subject
  WHERE r.id=NEW.reservation_id AND r.customer_subject=NEW.customer_subject
   AND r.status IN ('confirmed','checked_in','completed')
   AND ride.status<>'cancelled'
   AND venue.location IS NOT NULL AND ST_DWithin(ride.destination,venue.location,250)
 ) THEN RAISE EXCEPTION 'M8: ride must belong to the booking customer and end at the booked venue'; END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION m8_booking_ride_guard() FROM PUBLIC;
CREATE TRIGGER m8_booking_ride_integrity BEFORE INSERT OR UPDATE OR DELETE ON customer_booking_ride_links
 FOR EACH ROW EXECUTE FUNCTION m8_booking_ride_guard();
REVOKE ALL ON customer_booking_ride_links FROM PUBLIC;
