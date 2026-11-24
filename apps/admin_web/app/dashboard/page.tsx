export const dynamic='force-dynamic';
import {redirect} from 'next/navigation';
import {requireIdentity} from '@faji/web-auth/server';
import Console from './Console';
export default async function Page(){
 const identity=await requireIdentity();
 if(!identity.roles.includes('platform-admin'))redirect('/access-denied');
 return <Console/>;
}
