import {readFileSync,writeFileSync} from 'node:fs';
const source=new URL('../../api_contracts/openapi.json',import.meta.url);
const target=new URL('../routes.json',import.meta.url);
const {paths}=JSON.parse(readFileSync(source,'utf8'));
const rules=[];
for(const [path,operations] of Object.entries(paths)){
 if(/ride|dispatch|delivery/.test(path))continue;
 for(const method of Object.keys(operations)){
  if(!['get','post','put','patch','delete'].includes(method))continue;
  let audience=path.startsWith('/api/v1/discovery/')||path.startsWith('/api/v1/customer/')||path.startsWith('/api/v1/plans')?'customer':
   (path.startsWith('/api/v1/businesses/')||path.startsWith('/api/v1/business/onboarding'))&&!path.endsWith('/review')?'business':null;
  if(path==='/api/v1/auth/me')audience='both';
  if(audience)rules.push({path:path.replace('/api/v1/',''),method:method.toUpperCase(),audience});
 }
}
const output=JSON.stringify(rules,null,2)+'\n';
if(process.argv.includes('--check')){if(readFileSync(target,'utf8')!==output)throw Error('Regenerate web bridge rules from current OpenAPI contracts.');}
else writeFileSync(target,output);
