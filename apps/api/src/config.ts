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
  FAJI_EMAIL_DELIVERY_ENABLED: z.enum(['true','false']).default('true'),
  FAJI_RIDE_STORAGE_ENABLED: z.enum(['true','false']).default('true'),
  S3_ENDPOINT: z.url().optional(),
  S3_BUCKET: z.string().min(1).optional()
}).superRefine((cfg,ctx)=>{
 if (cfg.FAJI_RIDE_STORAGE_ENABLED==='true' && (!cfg.S3_ENDPOINT || !cfg.S3_BUCKET)) ctx.addIssue({code:'custom',path:['S3_ENDPOINT'],message:'Ride storage requires S3_ENDPOINT and S3_BUCKET'});
 if (['production','staging'].includes(cfg.NODE_ENV)) {
  if (!cfg.BETTER_AUTH_URL.startsWith('https://')) ctx.addIssue({code:'custom',path:['BETTER_AUTH_URL'],message:'HTTPS required'});
  if (cfg.FAJI_RIDE_STORAGE_ENABLED==='true' && cfg.S3_ENDPOINT && !cfg.S3_ENDPOINT.startsWith('https://')) ctx.addIssue({code:'custom',path:['S3_ENDPOINT'],message:'HTTPS required'});
 }
});
export type ApiEnvironment = z.infer<typeof environmentSchema>;
export function validateEnvironment(raw: Record<string,unknown>): ApiEnvironment { return environmentSchema.parse(raw); }
