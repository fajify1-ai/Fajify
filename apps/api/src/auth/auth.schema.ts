import {pgTable, text, boolean, timestamp, integer, bigint} from 'drizzle-orm/pg-core';
const date = (name:string) => timestamp(name, {withTimezone:true});
export const user = pgTable('auth_user', {
 id:text('id').primaryKey(), name:text('name').notNull(), email:text('email').notNull().unique(),
 emailVerified:boolean('email_verified').notNull().default(false), image:text('image'),
 username:text('username'),phoneNumber:text('phone_number'),dateOfBirth:text('date_of_birth'),homeAddress:text('home_address'),termsAccepted:boolean('terms_accepted').notNull().default(false),
 createdAt:date('created_at').notNull().defaultNow(), updatedAt:date('updated_at').notNull().defaultNow(),
});
export const session = pgTable('auth_session', {
 id:text('id').primaryKey(), token:text('token').notNull().unique(), userId:text('user_id').notNull().references(()=>user.id,{onDelete:'cascade'}),
 expiresAt:date('expires_at').notNull(), createdAt:date('created_at').notNull().defaultNow(), updatedAt:date('updated_at').notNull().defaultNow(),
 ipAddress:text('ip_address'), userAgent:text('user_agent'),
});
export const account = pgTable('auth_account', {
 id:text('id').primaryKey(), accountId:text('account_id').notNull(), providerId:text('provider_id').notNull(),
 userId:text('user_id').notNull().references(()=>user.id,{onDelete:'cascade'}), accessToken:text('access_token'), refreshToken:text('refresh_token'), idToken:text('id_token'),
 accessTokenExpiresAt:date('access_token_expires_at'), refreshTokenExpiresAt:date('refresh_token_expires_at'), scope:text('scope'), password:text('password'),
 createdAt:date('created_at').notNull().defaultNow(), updatedAt:date('updated_at').notNull().defaultNow(),
});
export const verification = pgTable('auth_verification', {
 id:text('id').primaryKey(), identifier:text('identifier').notNull(), value:text('value').notNull(), expiresAt:date('expires_at').notNull(),
 createdAt:date('created_at').notNull().defaultNow(), updatedAt:date('updated_at').notNull().defaultNow(),
});
export const rateLimit = pgTable('auth_rate_limit', { id:text('id').primaryKey(), key:text('key').notNull().unique(), count:integer('count').notNull(), lastRequest:bigint('last_request',{mode:'number'}).notNull() });
