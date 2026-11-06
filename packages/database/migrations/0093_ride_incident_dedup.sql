ALTER TABLE ride_incidents ADD COLUMN IF NOT EXISTS request_key varchar(120);
CREATE UNIQUE INDEX IF NOT EXISTS ride_incident_idempotency_idx ON ride_incidents(ride_id,reporter_subject,request_key) WHERE request_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS ride_requests_active_driver_idx ON ride_requests(assigned_driver_id) WHERE assigned_driver_id IS NOT NULL AND status IN ('assigned','driver_arriving','driver_arrived','in_progress');
