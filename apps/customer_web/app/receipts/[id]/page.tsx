import {requireIdentity} from '@faji/web-auth/server';
import {ReceiptPage} from '../../../connected/Receipt';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){await requireIdentity();const {id}=await params;return <ReceiptPage payment={id}/>;}
