import Authentication from '../../../unified/Authentication';
import {optionalIdentity} from '@faji/web-auth/server';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Page(){if(await optionalIdentity())redirect('/business/dashboard#onboarding');return <Authentication business register/>;}
