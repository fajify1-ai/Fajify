import { z } from 'zod';
export const environmentSchema = z.object({
  NODE_ENV: z.enum(['development','test','staging','production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  LOG_LEVEL: z.enum(['error','warn','log','debug']).default('log'),
  FAJI_DATABASE_URL: z.url().refine(s => s.startsWith('postgres://') || s.startsWith('postgresql://'), {error:'Must be PostgreSQL URL'}),
  REDIS_URL: z.url().refine(s=>s.startsWith('redis://') || s.startsWith('rediss://'), {error:'Must be Redis URL'}),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url().refine(s=>{const u=new URL(s);return u.protocol==='https:'||(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname));}),
  FAJI_WEB_ORIGINS: z.string().min(1),
  S3_ENDPOINT: z.url(),
  S3_BUCKET: z.string().min(1)
}).superRefine((cfg,ctx)=>{
 if (['production','staging'].includes(cfg.NODE_ENV)) {
  for(const key of ['BETTER_AUTH_URL','S3_ENDPOINT'] as const) if (!cfg[key].startsWith('https://')) ctx.addIssue({code:'custom',path:[key],message:'HTTPS required'});
 }
});
export type ApiEnvironment = z.infer<typeof environmentSchema>;
export function validateEnvironment(raw: Record<string,unknown>): ApiEnvironment { return environmentSchema.parse(raw); }
