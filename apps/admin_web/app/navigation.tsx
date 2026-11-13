'use client';

import { usePathname } from 'next/navigation';

const items = [
  ['Overview', '/operations'],
  ['Merchant applications', '/merchant-applications'],
  ['Support', '/operations/support'],
  ['Finance', '/operations/finance'],
  ['Reports', '/operations/reports'],
  ['Monitoring', '/operations/monitoring'],
  ['Audit log', '/operations/audit'],
] as const;

export function Navigation() {
  const path = usePathname();
  return (
    <nav className="console-nav" aria-label="Administration">
      {items.map(([label, href]) => {
        const active = href === '/operations' ? path === href : path === href || path.startsWith(href + '/');
        return <a key={href} href={href} aria-current={active ? 'page' : undefined}>{label}</a>;
      })}
    </nav>
  );
}
