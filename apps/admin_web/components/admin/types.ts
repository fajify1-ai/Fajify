export type AdminView='overview'|'applications'|'payments'|'customers'|'businesses'|'rides'|'reports'|'settings';

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
