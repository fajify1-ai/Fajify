import {proxyAuth} from '@faji/web-auth/proxy';
import type {NextRequest} from 'next/server';
import {requiresDeferredDelivery} from '../../../../unified/delivery-policy';
function handler(request:NextRequest){
 if(requiresDeferredDelivery(request.nextUrl.pathname))return Response.json({code:'DELIVERY_DEFERRED',message:'Email and SMS delivery are currently disabled. No message was sent.'},{status:503,headers:{'cache-control':'no-store'}});
 return proxyAuth(request);
}
export {handler as GET,handler as POST};
