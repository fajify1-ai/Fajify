import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sessionCookie, sessions } from '../../lib/session';
import { MerchantQueue } from './queue';

export default async function MerchantApplications() {
  const id = (await cookies()).get(sessionCookie)?.value;
  const session = sessions.get(id);
  if (!session) redirect(id ? '/?auth=expired' : '/');

  return (
    <main className="workspace" id="main">
      <div className="page-heading">
        <h1>Merchant applications</h1>
        <p>Review pending applications for access to the Faji Business workspace.</p>
      </div>
      <MerchantQueue expires={session.expires} />
    </main>
  );
}
