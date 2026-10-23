import { z } from 'zod';
export const environmentSchema = z.object({
  NODE_ENV: z.enum(['development','test','staging','production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  LOG_LEVEL: z.enum(['error','warn','log','debug']).default('log'),
  FAJI_DATABASE_URL: z.string().url().refine(s => s.startsWith('postgres://') || s.startsWith('postgresql://'), 'Must be PostgreSQL URL'),
  REDIS_URL: z.string().url().refine(s=>s.startsWith('redis://') || s.startsWith('rediss://'), 'Must be Redis URL'),
  KEYCLOAK_ISSUER: z.string().url().refine(s=>{
    const url=new URL(s);
    return url.protocol==='https:' || (url.protocol==='http:' && url.hostname==='localhost');
  }, 'Issuer must use HTTPS outside localhost'),
  KEYCLOAK_AUDIENCE: z.string().min(1),
  S3_ENDPOINT: z.string().url(),
  S3_BUCKET: z.string().min(1)
}).superRefine((cfg,ctx)=>{
 if (['production','staging'].includes(cfg.NODE_ENV)) {
  for(const key of ['KEYCLOAK_ISSUER','S3_ENDPOINT'] as const) if (!cfg[key].startsWith('https://')) ctx.addIssue({code:'custom',path:[key],message:'HTTPS required'});
 }
});
export type ApiEnvironment = z.infer<typeof environmentSchema>;
export function validateEnvironment(raw: Record<string,unknown>): ApiEnvironment { return environmentSchema.parse(raw); }
