import {NextResponse,type NextRequest} from 'next/server';
/** Review fixtures are opt-in and never a public replacement for live workflows. */
export function middleware(request:NextRequest){
 if(request.nextUrl.pathname.startsWith('/design-review')&&process.env.FAJI_DESIGN_REVIEW!=='1')return new NextResponse('Not found',{status:404,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
 return NextResponse.next();
}
export const config={matcher:'/design-review/:path*'};
