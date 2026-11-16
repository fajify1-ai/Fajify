export const dynamic='force-dynamic';
import {requireIdentity} from "@faji/web-auth/server";
import {SecuritySettings} from "@faji/web-auth/security";
export default async function Page(){await requireIdentity();return <SecuritySettings/>;}
