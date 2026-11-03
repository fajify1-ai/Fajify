/**
 * M7-P1 foundational ride-domain invariants.
 * Pure functions: the API/database layer must enforce transaction boundaries,
 * authorization, idempotency and concurrency separately.
 */
export const tripStates = [
  'requested', 'offered', 'assigned', 'driver_arriving',
  'driver_arrived', 'in_progress', 'completed', 'cancelled',
] as const;
export type TripState = (typeof tripStates)[number];

const transitions: Readonly<Record<TripState, readonly TripState[]>> = {
  requested: ['offered', 'cancelled'],
  offered: ['assigned', 'requested', 'cancelled'],
  assigned: ['driver_arriving', 'cancelled'],
  driver_arriving: ['driver_arrived', 'cancelled'],
  driver_arrived: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
};

export function canTransitionTrip(from: TripState, to: TripState): boolean {
  return transitions[from].includes(to);
}

export function assertTripTransition(from: TripState, to: TripState): void {
  if (!canTransitionTrip(from, to)) {
    throw new Error(`Illegal trip transition: ${from} -> ${to}`);
  }
}

export type DriverEligibility = {
  approved: boolean;
  suspended: boolean;
  vehicleApproved: boolean;
  documentsExpireAt: Date | null;
  available: boolean;
  hasActiveAssignment: boolean;
};

export function canOfferRideToDriver(driver: DriverEligibility, now: Date): boolean {
  return driver.approved &&
    !driver.suspended &&
    driver.vehicleApproved &&
    driver.documentsExpireAt instanceof Date &&
    Number.isFinite(driver.documentsExpireAt.getTime()) &&
    driver.documentsExpireAt.getTime() > now.getTime() &&
    driver.available &&
    !driver.hasActiveAssignment;
}

export type DriverPosition = {
  latitude: number;
  longitude: number;
  recordedAt: Date;
  consentGranted: boolean;
};

export function isUsableDriverPosition(
  position: DriverPosition, now: Date, maxAgeMs: number,
): boolean {
  const age = now.getTime() - position.recordedAt.getTime();
  return position.consentGranted &&
    Number.isFinite(position.latitude) && position.latitude >= -90 && position.latitude <= 90 &&
    Number.isFinite(position.longitude) && position.longitude >= -180 && position.longitude <= 180 &&
    Number.isFinite(maxAgeMs) && maxAgeMs >= 0 &&
    Number.isFinite(age) && age >= 0 && age <= maxAgeMs;
}
