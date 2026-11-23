export type AdminView='overview'|'applications'|'payments'|'reviews'|'restrictions'|'support'|'incidents'|'monitoring'|'customers'|'businesses'|'rides'|'reports'|'audit'|'integrations'|'settings';

export type Application={
 id:string;
 displayName:string;
 status:string;
 createdAt:string;
};

export type ApplicationDetails=Application & {
 application:Record<string,unknown>|null;
 submittedAt:string|null;
};

export type Payment={
 id:string;
 amountMinor:string;
 currency:string;
 createdAt:string;
};
