export const dynamic='force-dynamic';
import {requireIdentity} from '@faji/web-auth/server';
import type {Identity} from '@faji/web-ui/types';
import Client from '../../connected/Client';
export default async function Page(){const identity=await requireIdentity();return <Client identity={identity as Identity}/>;}
