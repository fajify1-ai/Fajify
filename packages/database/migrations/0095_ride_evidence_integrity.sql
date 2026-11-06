-- Append-only ride transition and financial evidence.
CREATE OR REPLACE FUNCTION faji_ride_reject_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Ride evidence is append-only' USING ERRCODE='42501';
END;
$$;
CREATE TRIGGER ride_trip_events_immutable
 BEFORE UPDATE OR DELETE ON ride_trip_events FOR EACH ROW EXECUTE FUNCTION faji_ride_reject_event_mutation();
CREATE TRIGGER ride_financial_events_immutable
 BEFORE UPDATE OR DELETE ON ride_financial_events FOR EACH ROW EXECUTE FUNCTION faji_ride_reject_event_mutation();

CREATE INDEX IF NOT EXISTS ride_dispatch_offers_fence_idx
 ON ride_dispatch_offers(ride_id,fence_version,status,expires_at);
CREATE INDEX IF NOT EXISTS ride_fares_settlement_idx
 ON ride_fares(settlement_state,payment_state) WHERE settlement_state<>'reconciled';
