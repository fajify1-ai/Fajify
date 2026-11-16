import { platformProxy } from '@faji/web-ui/server';
import type { NextRequest } from 'next/server';
export const dynamic='force-dynamic';
const handler=(request:NextRequest)=>platformProxy(request,'customer');
export {handler as GET,handler as POST,handler as PATCH,handler as PUT,handler as DELETE};
