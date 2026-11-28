import {requireIdentity} from '@faji/web-auth/server';
import type {Identity} from '@faji/web-ui/types';
import Client from '@faji/business-web/connected/client';

export const dynamic='force-dynamic';

export default async function Page(){
 const identity=await requireIdentity('/business/login');
 return <Client experienceHref="/" identity={identity as Identity} initialTab="Verification"/>;
}
