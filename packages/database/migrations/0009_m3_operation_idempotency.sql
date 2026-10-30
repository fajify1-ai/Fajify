-- M3-P1 merchant-assisted write retries. NULL keys preserve legacy requests.
ALTER TABLE business_reservations ADD COLUMN request_key varchar(100);
ALTER TABLE business_orders ADD COLUMN request_key varchar(100);
CREATE UNIQUE INDEX business_reservations_idempotency_idx
 ON business_reservations(business_id,branch_id,customer_subject,request_key)
 WHERE request_key IS NOT NULL;
CREATE UNIQUE INDEX business_orders_idempotency_idx
 ON business_orders(business_id,branch_id,customer_subject,request_key)
 WHERE request_key IS NOT NULL;
