-- M7 quote terms must never change after issue, including under migration credentials.
-- Booking reads only SELECT on this append-only table; the unique quote_id
-- index on ride_requests enforces single-use quotes for concurrent requests.
CREATE TRIGGER ride_fare_quotes_immutable
 BEFORE UPDATE OR DELETE ON ride_fare_quotes
 FOR EACH ROW EXECUTE FUNCTION faji_ride_reject_event_mutation();
