export const dynamic='force-dynamic';
import {requireIdentity} from '@faji/web-auth/server';
import {SignOut} from '@faji/web-auth/form';
export default async function Page(){const identity=await requireIdentity();if(!identity.roles.some(role=>['driver','dispatcher'].includes(role)))return <main><p>Operational access is pending approval.</p><a href="/account-security">Account security</a><SignOut/></main>;return <main><h1>Faji Ride & Dispatch</h1><p>Signed in</p><a href="/account-security">Account security</a><SignOut/></main>;}
