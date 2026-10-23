import { existsSync } from 'node:fs';
const required=['package.json','pnpm-workspace.yaml','turbo.json','melos.yaml','apps/api/package.json','apps/worker/package.json','apps/customer_web/package.json','apps/admin_web/package.json','apps/business_mobile/pubspec.yaml','apps/ride_dispatch/pubspec.yaml','infrastructure/docker/compose.yaml'];
const missing=required.filter(path=>!existsSync(path));
if(missing.length){console.error('Missing workspace entrypoints:\n'+missing.join('\n'));process.exit(1)}
console.log('PASS: structured workspaces are present (not a runtime/build verification).');
if(!existsSync('apps/customer_mobile/pubspec.yaml'))console.log('Customer Flutter import remains pending in PR #1.');
