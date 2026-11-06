/** Pure decision boundary: recommendations are never payment confirmations or capacity holds. */
export interface BookingEligibility {
  nowMs: number;
  slotStartsMs: number;
  available: number;
  guests: number;
  quotedTotalMinor: string;
  authoritativeTotalMinor: string;
  currency: string;
  quoteCurrency: string;
  active: boolean;
  published: boolean;
  merchantApproved: boolean;
}
export type BookingDecision =
  | {allowed:true;requiresCapacityLock:true;requiresPaymentVerification:true}
  | {allowed:false;reason:'inactive'|'expired'|'capacity'|'currency'|'price_changed'};
export function bookingEligibility(v:BookingEligibility):BookingDecision {
  if(!v.active||!v.published||!v.merchantApproved)return {allowed:false,reason:'inactive'};
  if(!Number.isFinite(v.slotStartsMs)||v.slotStartsMs<=v.nowMs)return {allowed:false,reason:'expired'};
  if(!Number.isSafeInteger(v.guests)||v.guests<1||!Number.isSafeInteger(v.available)||v.available<v.guests)
    return {allowed:false,reason:'capacity'};
  if(v.currency!==v.quoteCurrency)return {allowed:false,reason:'currency'};
  if(!/^(0|[1-9][0-9]*)$/.test(v.quotedTotalMinor)||!/^(0|[1-9][0-9]*)$/.test(v.authoritativeTotalMinor)||BigInt(v.quotedTotalMinor)!==BigInt(v.authoritativeTotalMinor))
    return {allowed:false,reason:'price_changed'};
  return {allowed:true,requiresCapacityLock:true,requiresPaymentVerification:true};
}
