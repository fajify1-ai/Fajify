import type { ReactNode } from 'react';
import '../webapp/styles.css';
import '../connected/styles.css';
import '@faji/business-web/feature.css';
import '@faji/business-web/connected/styles.css';
import './waitlist/waitlist.css';
import './businesswaitlist/businesswaitlist.css';
export const metadata = {
 title: 'Fajify',
 icons:{icon:'/icon.svg',shortcut:'/icon.svg',apple:'/icon.svg'}
};
export default function Layout({children}:{children:ReactNode}) { return <html lang="en"><body>{children}</body></html> }
