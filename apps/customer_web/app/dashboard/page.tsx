import {requireIdentity} from '@faji/web-auth/server';
import {SignOut} from '@faji/web-auth/form';
export default async function Page(){const identity=await requireIdentity();return <main><h1>Faji Customer</h1><p>Signed in</p><SignOut/></main>;}
