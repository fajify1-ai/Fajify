export const dynamic='force-dynamic';
import {requireIdentity} from '@faji/web-auth/server';
import {SecuritySettings} from '@faji/web-auth/security';
import {AuthShell} from '../../connected/AuthPage';
export default async function Page({searchParams}:{searchParams:Promise<{experience?:string}>}){const business=(await searchParams).experience==='business';await requireIdentity(business?'/business/login':'/login');return <AuthShell><SecuritySettings deliveryDeferred workspaceHref={business?'/business/dashboard':'/customer#profile'}/></AuthShell>;}
