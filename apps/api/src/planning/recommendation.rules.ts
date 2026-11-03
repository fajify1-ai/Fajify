/**
 * M6-P1: deterministic recommendation eligibility and ranking.
 * Inputs must come from server-authoritative, published merchant and availability reads.
 * Monetary values are minor units; do not use floating-point currency arithmetic.
 */
export interface PlanningPreferences {
  budgetMinor: string;
  currency: string;
  guests: number;
  startsAfter: string;
  startsBefore: string;
  location?: string;
  categories?: string[];
}
export interface PlanningCandidate {
  id: string;
  name: string;
  category: string;
  address: string;
  currency: string;
  pricePerGuestMinor: string;
  availableSeats: number;
  startsAt: string;
  active: boolean;
  published: boolean;
  merchantApproved: boolean;
}
export interface RankedExperience {
  id: string;
  score: number;
  totalMinor: string;
  reasons: string[];
  candidate: PlanningCandidate;
}
const amount = (raw: string): bigint => {
  if (!/^(0|[1-9][0-9]*)$/.test(raw)) throw new Error('Invalid minor-unit amount');
  return BigInt(raw);
};
const timestamp = (raw: string): number => {
  const ms=Date.parse(raw);
  if (!Number.isFinite(ms) || !/(Z|[+-][0-9]{2}:[0-9]{2})$/.test(raw))
    throw new Error('Timestamp must have an explicit timezone');
  return ms;
};
export function rankExperiences(input: PlanningPreferences, candidates: readonly PlanningCandidate[]): RankedExperience[] {
  if (!Number.isSafeInteger(input.guests) || input.guests < 1 || input.guests > 100)
    throw new Error('Invalid group size');
  const budget=amount(input.budgetMinor);
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new Error('Invalid currency');
  const from=timestamp(input.startsAfter),to=timestamp(input.startsBefore);
  if (to<=from) throw new Error('Invalid planning window');
  const location=input.location?.trim().toLocaleLowerCase();
  const categories=new Set(input.categories?.map(v=>v.trim().toLocaleLowerCase()));
  const results: RankedExperience[]=[];
  for (const candidate of candidates) {
    if (!candidate.active || !candidate.published || !candidate.merchantApproved) continue;
    if (candidate.currency!==input.currency) continue;
    if (!Number.isSafeInteger(candidate.availableSeats) || candidate.availableSeats<input.guests) continue;
    const starts=timestamp(candidate.startsAt);
    if (starts<from || starts>=to) continue;
    if (location && !candidate.address.toLocaleLowerCase().includes(location)) continue;
    if (categories.size && !categories.has(candidate.category.toLocaleLowerCase())) continue;
    const total=amount(candidate.pricePerGuestMinor)*BigInt(input.guests);
    if (total>budget) continue;
    // Prefer closer budget fit and earlier availability, but never relax hard constraints.
    const budgetFit=budget===0n ? 100 : Number((total*100n)/budget);
    const timeFit=Math.max(0,100-Math.floor(((starts-from)/(to-from))*100));
    const score=budgetFit*2+timeFit;
    const reasons=['Within budget','Sufficient capacity','Available in requested window'];
    if (location) reasons.push('Matches requested location');
    if (categories.size) reasons.push('Matches selected category');
    results.push({id:candidate.id,score,totalMinor:total.toString(),reasons,candidate});
  }
  return results.sort((a,b)=>b.score-a.score || a.candidate.startsAt.localeCompare(b.candidate.startsAt) || a.id.localeCompare(b.id));
}
