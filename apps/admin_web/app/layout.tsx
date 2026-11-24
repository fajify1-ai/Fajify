import type {ReactNode} from 'react';
import type {Metadata} from 'next';
import {AdminToaster} from '../components/admin/AdminToaster';
import './globals.css';

export const metadata:Metadata={
 title:{default:'Fajify Platform Admin',template:'%s | Fajify Admin'},
 description:'Restricted Fajify platform administration workspace.',
 icons:{icon:'/icon.svg',shortcut:'/icon.svg',apple:'/icon.svg'}
};

export default function Layout({children}:{children:ReactNode}){
 return <html lang="en" suppressHydrationWarning>
  <body className="min-h-screen bg-background font-sans text-foreground antialiased">
   {children}
   <AdminToaster/>
  </body>
 </html>;
}
