import {pgTable,uuid,varchar,timestamp,boolean,index,uniqueIndex,text} from 'drizzle-orm/pg-core';
export const userProfiles=pgTable('user_profiles',{
 id:uuid('id').primaryKey().defaultRandom(),
 identitySubject:varchar('identity_subject',{length:255}).notNull().unique(),
 displayName:varchar('display_name',{length:120}),
 suspended:boolean('suspended').notNull().default(false),
 createdAt:timestamp('created_at',{withTimezone:true}).notNull().defaultNow(),
 updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow()
});
export const auditEvents=pgTable('audit_events',{
 id:uuid('id').primaryKey().defaultRandom(),
 actorSubject:varchar('actor_subject',{length:255}),
 action:varchar('action',{length:120}).notNull(),
 resourceType:varchar('resource_type',{length:80}).notNull(),
 resourceId:uuid('resource_id'),
 occurredAt:timestamp('occurred_at',{withTimezone:true}).notNull().defaultNow()
},t=>[index('audit_events_occurred_at_idx').on(t.occurredAt)]);
export const outboxEvents=pgTable('outbox_events',{
 id:uuid('id').primaryKey().defaultRandom(),
 eventType:varchar('event_type',{length:120}).notNull(),
 payload:text('payload').notNull(),
 publishedAt:timestamp('published_at',{withTimezone:true}),
 createdAt:timestamp('created_at',{withTimezone:true}).notNull().defaultNow()
},t=>[index('outbox_unpublished_idx').on(t.publishedAt,t.createdAt)]);
