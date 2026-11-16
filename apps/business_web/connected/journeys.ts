import {platform} from '@faji/web-ui/client';
export async function journey<T>(path:string,body?:unknown,method?:string){return (await platform<{data:T}>(path,body,method)).data;}
