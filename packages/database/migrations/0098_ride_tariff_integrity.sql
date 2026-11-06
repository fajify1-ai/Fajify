-- Preserve reviewed tariff prices after publication.
CREATE OR REPLACE FUNCTION faji_ride_preserve_tariff_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF OLD.active=true AND NEW.active=false
     AND (to_jsonb(NEW)-'active')=(to_jsonb(OLD)-'active') THEN
   RETURN NEW;
  END IF;
 END IF;
 RAISE EXCEPTION 'Ride tariff history is immutable' USING ERRCODE='42501';
END;
$$;
CREATE TRIGGER ride_tariff_history_immutable
 BEFORE UPDATE OR DELETE ON ride_tariff_policies
 FOR EACH ROW EXECUTE FUNCTION faji_ride_preserve_tariff_history();
