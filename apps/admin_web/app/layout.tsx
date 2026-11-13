import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { sessionCookie, sessions } from '../lib/session';
import './styles.css';

export const metadata = { title: 'Faji Admin' };

export default async function Layout({ children }: { children: ReactNode }) {
  const signedIn = Boolean(sessions.get((await cookies()).get(sessionCookie)?.value));
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <a href="/" className="brand"><strong>Faji</strong> Admin</a>
            {signedIn && <form action="/auth/logout" method="post"><button>Sign out</button></form>}
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
