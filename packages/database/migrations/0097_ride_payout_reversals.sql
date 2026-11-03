-- M7 payout reversal accounting and fee observations.
ALTER TABLE ride_driver_payouts DROP CONSTRAINT IF EXISTS ride_driver_payouts_state_check;
ALTER TABLE ride_driver_payouts ADD CONSTRAINT ride_driver_payouts_state_check
 CHECK (state IN ('reserved','submitting','uncertain','confirmed','reconciled','failed','reversed'));
CREATE TABLE IF NOT EXISTS ride_payout_fee_evidence (
 payout_id uuid PRIMARY KEY REFERENCES ride_driver_payouts(id),
 fee_minor bigint NOT NULL CHECK(fee_minor>=0),
 return_minor bigint CHECK(return_minor>=0),
 observed_at timestamptz NOT NULL DEFAULT now(),
 CHECK(return_minor IS NULL OR return_minor<=fee_minor)
);
