export const dynamic='force-dynamic';
import {requireIdentity} from '@faji/web-auth/server';
import Client from '../../connected/Client';
export default async function Page(){await requireIdentity();return <Client initial="profile"/>;}
