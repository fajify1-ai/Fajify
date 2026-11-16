import {customerReturnTo} from '../../unified/return-to';
import Authentication from '../../unified/Authentication';
import {optionalIdentity} from '@faji/web-auth/server';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{returnTo?:string}>}){const target=customerReturnTo((await searchParams).returnTo);if(await optionalIdentity())redirect(target);return <Authentication returnTo={target}/>;}
