import {requireIdentity} from '@faji/web-auth/server';
import {SignOut} from '@faji/web-auth/form';
export default async function Page(){const identity=await requireIdentity();if(!identity.roles.includes('merchant'))return <main><p>Access is pending approval.</p><SignOut/></main>;return <main><h1>Faji Business</h1><p>Signed in</p><SignOut/></main>;}
