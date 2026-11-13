import { notFound, redirect } from 'next/navigation';
import { requireOperator } from '../../../lib/operations';
import { applicationIdPattern } from '../../../lib/merchant-contract';
import { Audit, Finance, Monitoring, Overview, Reports, Support } from './views';

const sections = {
  overview: { title: 'Operations overview', description: 'Review the queues and exceptions that need an operator’s attention.' },
  support: { title: 'Customer support', description: 'Review cases, reply to customers and manage assignments.' },
  finance: { title: 'Finance', description: 'Review verified payment activity, settlements and reconciliation exceptions.' },
  reports: { title: 'Reports', description: 'Inspect platform activity and merchant performance.' },
  monitoring: { title: 'Monitoring', description: 'Inspect job health, acknowledge alerts and manage incidents.' },
  audit: { title: 'Audit log', description: 'Inspect administrative activity and identity security events.' },
} as const;

type Props = {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Operations({ params, searchParams }: Props) {
  const session = await requireOperator();
  const [{ section = [] }, search] = await Promise.all([params, searchParams]);
  const [area = 'overview', id, extra] = section;
  if (!Object.hasOwn(sections, area) || extra !== undefined ||
      (id && ((area !== 'support' && area !== 'reports') || !applicationIdPattern.test(id)))) notFound();
  if (area === 'reports' && !id && typeof search.business === 'string' && applicationIdPattern.test(search.business)) {
    redirect('/operations/reports/' + search.business);
  }
  const { title, description } = sections[area as keyof typeof sections];
  const token = session.accessToken;

  return <main id="main" className="workspace operations-workspace">
    <div className="page-heading"><h1>{title}</h1><p>{description}</p></div>
    <div className="ops-content">
      {area === 'overview' && <Overview token={token} />}
      {area === 'support' && <Support token={token} id={id} search={search} />}
      {area === 'finance' && <Finance token={token} />}
      {area === 'reports' && <Reports token={token} business={id} search={search} />}
      {area === 'monitoring' && <Monitoring token={token} search={search} />}
      {area === 'audit' && <Audit token={token} search={search} />}
    </div>
  </main>;
}
