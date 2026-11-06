/** M3-P1 authority is server-side: verified identity, active account, approved business,
 * business membership and branch-scoped membership for staff.
 * Roles come from PostgreSQL memberships, not from a client-requested role.
 * This file is an integration placeholder for Phase 3 and Phase 4 clients.
 */
export const BUSINESS_API_V1='/api/v1/businesses/:businessId' as const;
export const BUSINESS_ORDER_STATES=['placed','accepted','preparing','ready','fulfilled','cancelled'] as const;
export const BUSINESS_RESERVATION_STATES=['confirmed','checked_in','completed','cancelled'] as const;
