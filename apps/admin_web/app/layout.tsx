import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import Image from 'next/image';
import { sessionCookie, sessions } from '../lib/session';
import { Navigation } from './navigation';
import './styles.css';

export const metadata = { title: { default: 'Fajify Admin', template: '%s · Fajify Admin' } };

export default async function Layout({ children }: { children: ReactNode }) {
  const signedIn = Boolean(await sessions.get((await cookies()).get(sessionCookie)?.value));
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <header className="topbar">
          <div className="topbar-inner">
            <a href={signedIn ? '/operations' : '/'} className="brand">
              <Image src="/fajify-mark.webp" width={34} height={34} alt="" />
              <strong>Fajify</strong><span>Admin</span>
            </a>
            {signedIn && <form action="/auth/logout" method="post"><button>Sign out</button></form>}
          </div>
        </header>
        {signedIn ? <div className="console"><Navigation /><div className="console-body">{children}</div></div> : children}
      </body>
    </html>
  );
}
