export const dynamic='force-dynamic';
import {requireIdentity} from '@faji/web-auth/server';
import {SignOut} from '@faji/web-auth/form';
import Console from './Console';
export default async function Page(){const identity=await requireIdentity();if(!identity.roles.includes('platform-admin'))return <main><p>Access is pending approval.</p><a href="/account-security">Account security</a><SignOut/></main>;return <><Console/><div style={{maxWidth:1000,margin:'0 auto 32px',padding:'0 18px'}}><SignOut/></div></>;}
