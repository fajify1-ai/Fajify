import { requireOperator } from '../../lib/operations';
import { MerchantQueue } from './queue';

export default async function MerchantApplications() {
  const session = await requireOperator();

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
