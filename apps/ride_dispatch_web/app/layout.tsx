import type {ReactNode} from 'react';
import type {Metadata} from 'next';
export const metadata:Metadata={title:'Fajify Dispatch',icons:{icon:'/icon.svg',shortcut:'/icon.svg',apple:'/icon.svg'}};
export default function Layout({children}:{children:ReactNode}){return <html lang="en"><body style={{fontFamily:'system-ui',margin:0}}>{children}</body></html>;}
