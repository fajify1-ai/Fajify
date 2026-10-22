import type { ReactNode } from 'react';
export const metadata = { title: 'Faji Customer' };
export default function Layout({children}:{children:ReactNode}) {
  return <html lang="en"><body style={{fontFamily:'system-ui, sans-serif',margin:0}}>{children}</body></html>;
}
