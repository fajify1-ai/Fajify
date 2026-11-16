import type { components } from './contracts';
export type Schema<K extends keyof components['schemas']> = components['schemas'][K];
export type Identity={subject:string;roles:string[];memberships?:{resourceType:'business';resourceId:string;role:'owner'|'manager'|'staff';status:'approved'}[]};
// Merchant controllers currently expose SQL rows rather than response DTO schemas.
// Field names below follow their existing service contracts; no endpoint is invented.
export type MerchantRow={id:string;name?:string;display_name?:string;status?:string;business_id?:string;branch_id?:string;kind?:string;price_minor?:string;total_minor?:string;currency?:string;published?:boolean;active?:boolean;address?:string;contact_email?:string;starts_at?:string;ends_at?:string;capacity?:number;reserved?:number;catalogue_id?:string;customer_subject?:string;guests?:number;identity_subject?:string;role?:string;resource_type?:string;resource_id?:string};
export type BusinessOverview={branches:number;catalogue_items:number;reservations:number;orders:number;fulfilled_order_total_minor:string};
