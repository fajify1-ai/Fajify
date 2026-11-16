import type { ReactNode } from 'react';
import '../webapp/styles.css';
import '../connected/styles.css';
export const metadata = { title: 'Fajify Business' };
export default function Layout({children}:{children:ReactNode}) { return <html lang="en"><body>{children}</body></html> }
