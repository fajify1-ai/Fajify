export type AdminView='overview'|'applications'|'account-kyc'|'payments'|'waitlist'|'business-waitlist'|'reviews'|'restrictions'|'support'|'incidents'|'monitoring'|'customers'|'businesses'|'rides'|'reports'|'audit'|'integrations'|'access'|'settings';

export type Application={
 id:string;
 displayName:string;
 status:string;
 createdAt:string;
};

export type ApplicationDetails=Application & {
 applicantSubject:string;
 reviewReason:string|null;
 accountKycStatus:string;
 verificationDocuments:{id:string;name:string;mime:string;documentType:string;createdAt:string}[];
 application:Record<string,unknown>|null;
 submittedAt:string|null;
};

export type Payment={
 id:string;
 amountMinor:string;
 currency:string;
 createdAt:string;
};
