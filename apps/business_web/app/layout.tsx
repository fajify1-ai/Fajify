import type { ReactNode } from 'react';
import '../webapp/styles.css';
import '../connected/styles.css';
export const metadata = {
 title: 'Fajify Business',
 icons:{icon:'/icon.svg',shortcut:'/icon.svg',apple:'/icon.svg'}
};
export default function Layout({children}:{children:ReactNode}) { return <html lang="en"><body>{children}</body></html> }
