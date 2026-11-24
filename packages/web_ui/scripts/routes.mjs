import {readFileSync,writeFileSync} from 'node:fs';
const source=new URL('../../api_contracts/openapi.json',import.meta.url);
const target=new URL('../routes.json',import.meta.url);
const {paths}=JSON.parse(readFileSync(source,'utf8'));
const rules=[];
const adminRoutes=new Set([
 'GET /api/v1/admin/waitlist',
 'GET /api/v1/admin/waitlist/business',
 'GET /api/v1/admin/governance/approvals',
 'GET /api/v1/admin/governance/approvals/{id}',
 'POST /api/v1/business/onboarding/{id}/review',
 'GET /api/v1/admin/finance/simulations',
 'POST /api/v1/admin/finance/payments/{id}/simulation',
 'GET /api/v1/admin/operations/overview',
 'GET /api/v1/admin/operations/audit',
 'GET /api/v1/admin/access/manager',
 'GET /api/v1/admin/access/admins',
 'POST /api/v1/admin/access/grants',
 'GET /api/v1/admin/governance/reviews',
 'GET /api/v1/admin/governance/restrictions',
 'POST /api/v1/admin/governance/reviews/{id}/moderation',
 'POST /api/v1/admin/governance/branches/{id}/restriction',
 'POST /api/v1/admin/governance/catalogue/{id}/restriction',
 'GET /api/v1/admin/support/cases',
 'GET /api/v1/admin/support/cases/{id}',
 'POST /api/v1/admin/support/cases/{id}/assignment',
 'POST /api/v1/admin/support/cases/{id}/messages',
 'POST /api/v1/admin/support/cases/{id}/status',
 'GET /api/v1/admin/incidents',
 'POST /api/v1/admin/incidents',
 'POST /api/v1/admin/incidents/{id}/status',
 'GET /api/v1/admin/finance/summary',
 'GET /api/v1/admin/reports/overview',
 'GET /api/v1/admin/reports/businesses/{id}',
 'GET /api/v1/admin/integrations/consistency',
 'GET /api/v1/admin/monitoring/status',
 'POST /api/v1/admin/monitoring/check',
 'GET /api/v1/admin/monitoring/alerts',
 'POST /api/v1/admin/monitoring/alerts/{id}/acknowledgement',
 'GET /api/v1/admin/operations/command-audit',
 'GET /api/v1/admin/integrations/customers/{subject}/activity',
]);
for(const [path,operations] of Object.entries(paths)){
 if(/ride|dispatch|delivery/.test(path))continue;
 for(const method of Object.keys(operations)){
  if(!['get','post','put','patch','delete'].includes(method))continue;
  let audience=adminRoutes.has(method.toUpperCase()+' '+path)?'admin':
   (path==='/api/v1/waitlist'||path==='/api/v1/waitlist/business')&&method==='post'?'customer':
   path.startsWith('/api/v1/discovery/')||path.startsWith('/api/v1/customer/')||path.startsWith('/api/v1/plans')?'customer':
   (path.startsWith('/api/v1/businesses/')||path.startsWith('/api/v1/business/onboarding'))&&!path.endsWith('/review')?'business':null;
  if(path==='/api/v1/auth/me')audience='both';
  if(audience)rules.push({path:path.replace('/api/v1/',''),method:method.toUpperCase(),audience});
 }
}
const output=JSON.stringify(rules,null,2)+'\n';
if(process.argv.includes('--check')){if(readFileSync(target,'utf8')!==output)throw Error('Regenerate web bridge rules from current OpenAPI contracts.');}
else writeFileSync(target,output);
