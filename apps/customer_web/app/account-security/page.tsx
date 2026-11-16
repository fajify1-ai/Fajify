export const dynamic='force-dynamic';
import {requireIdentity} from '@faji/web-auth/server';
import {SecuritySettings} from '@faji/web-auth/security';
import {AuthShell} from '../../connected/AuthPage';
export default async function Page(){await requireIdentity();return <AuthShell><SecuritySettings deliveryDeferred/></AuthShell>;}
