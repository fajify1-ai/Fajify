import type { ReactNode } from 'react';
import { readAdmin, type AdminResult } from '../../../lib/operations';
import { formatNaira, incidentTypes, priorities, severities, transitions } from '../../../lib/operations-contract';
import { CommandForm } from '../command-form';

type Row = Record<string, string | number | boolean | null | undefined>;
type Page = { items: Row[]; nextOffset: number | null };
type SupportDetail = { subject: string; category: string; priority: string; status: string;
  assignedTo: string | null; resourceId: string | null; updatedAt: string; messages: Page };
type Field = readonly [key: string, label: string, kind?: 'money' | 'date'];
type Search = Record<string, string | string[] | undefined>;

const date = new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' });
const amountFields: Field[] = [['capturedMinor', 'Successful captures', 'money'], ['refundedMinor', 'Processed refunds', 'money'],
  ['settledMinor', 'Successful settlements', 'money'], ['reconciledRideDriverPayoutMinor', 'Reconciled driver payouts', 'money']];
const reportFields: Field[] = [['customers', 'New customers'], ['approvedBusinesses', 'Approved merchants'],
  ['createdOrders', 'Orders created'], ['createdReservations', 'Reservations created'], ['issuedTickets', 'Tickets issued'],
  ['requestedRides', 'Rides requested'], ['completedRides', 'Rides completed']];
const reportMoney: Field[] = [['verifiedCaptureMinor', 'Verified captures', 'money'],
  ['verifiedRideGrossMinor', 'Verified ride gross', 'money'], ['ledgerPlatformRevenueMinor', 'Ledger platform revenue', 'money']];
const monitorFields: Field[] = [['deadFinanceJobs', 'Dead finance jobs'], ['expiredFinanceLeases', 'Expired finance leases'],
  ['overdueFinanceJobs', 'Overdue finance jobs'], ['openFinanceExceptions', 'Open finance exceptions'],
  ['staleOutboxEvents', 'Stale outbox events'], ['openUrgentRideIncidents', 'Urgent ride incidents']];

function display(value: Row[string], kind?: Field[2]) {
  if (value === undefined || value === null || value === '') return '—';
  if (kind === 'money') return typeof value === 'string' ? formatNaira(value) : '—';
  if (kind === 'date') return Number.isFinite(Date.parse(String(value))) ? date.format(new Date(String(value))) + ' WAT' : '—';
  if (typeof value === 'number') return value.toLocaleString('en-NG');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return value;
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="ops-panel"><header><h2>{title}</h2>{action}</header>{children}</section>;
}

function Result<T>({ result, grant, children }: { result: AdminResult<T>; grant: string; children: (data: T) => ReactNode }) {
  if (result.data !== undefined) return children(result.data);
  const message = result.status === 403 ? `Access denied. This view requires ${grant} and an active operator account.`
    : result.status === 404 ? 'The requested record could not be found.'
    : result.status === 429 ? 'The API request limit was reached. Wait briefly and refresh this page.'
    : 'The API could not load this section. Refresh this page to retry.';
  return <p className="ops-note" role="status">{message}</p>;
}

function Metrics({ data, fields }: { data: Row; fields: Field[] }) {
  return <dl className="metrics">{fields.map(([key, label, kind]) => <div key={key}><dt>{label}</dt><dd>{display(data[key], kind)}</dd></div>)}</dl>;
}

function Rows({ data, fields, empty, action }: { data: Row[]; fields: Field[]; empty: string; action?: (row: Row) => ReactNode }) {
  if (!data.length) return <p className="ops-note">{empty}</p>;
  return <div className="table-wrap" tabIndex={0} role="region" aria-label="Results"><table>
    <thead><tr>{fields.map(([key, label]) => <th scope="col" key={key}>{label}</th>)}{action && <th scope="col">Action</th>}</tr></thead>
    <tbody>{data.map(row => <tr key={String(row.id)}>
      {fields.map(([key, , kind]) => <td key={key}>{display(row[key], kind)}</td>)}
      {action && <td>{action(row)}</td>}
    </tr>)}</tbody>
  </table></div>;
}

const pageSize = 20;
export function offsetOf(value: Search[string]) {
  if (typeof value !== 'string' || !/^\d{1,5}$/.test(value)) return 0;
  return Math.min(10_000, Number(value));
}
function pager(offset: number) { return `limit=${pageSize}&offset=${offset}`; }

function Pagination({ data, offset, base }: { data: Page; offset: number; base: string }) {
  const href = (next: number) => base + (base.includes('?') ? '&' : '?') + 'offset=' + next;
  if (!offset && data.nextOffset === null) return null;
  return <nav className="ops-pagination" aria-label="Result pages">
    <span>{data.items.length ? `Showing ${offset + 1}–${offset + data.items.length}` : 'No results on this page'}</span>
    {offset > 0 && <a href={href(Math.max(0, offset - pageSize))}>Previous</a>}
    {data.nextOffset !== null && data.nextOffset > offset && data.nextOffset <= 10_000 && <a href={href(data.nextOffset)}>Next</a>}
  </nav>;
}

const supportFields: Field[] = [['subject', 'Case'], ['category', 'Category'], ['priority', 'Priority'], ['updatedAt', 'Updated', 'date']];
const alertFields: Field[] = [['summary', 'Alert'], ['severity', 'Severity'], ['state', 'Incident state'], ['createdAt', 'Raised', 'date']];
const incidentFields: Field[] = [['summary', 'Incident'], ['incidentType', 'Type'], ['severity', 'Severity'], ['state', 'State'], ['updatedAt', 'Updated', 'date']];

function Options({ values }: { values: readonly string[] }) {
  return <>{values.map(value => <option key={value} value={value}>{value}</option>)}</>;
}
function Reason() {
  return <label>Reason<textarea name="reason" required minLength={8} maxLength={500} rows={2} /></label>;
}
const idOf = (row: Row) => String(row.id);

export async function Overview({ token }: { token: string }) {
  const result = await readAdmin<Row>(token, 'operations/overview');
  return <>
    <Panel title="Work awaiting review"><Result result={result} grant="operations.read">{data =>
      <div className="work-list">
        {([['Merchant applications', '/merchant-applications', 'pendingBusinessApprovals'],
          ['Open support cases', '/operations/support', 'openSupportCases'],
          ['Hidden customer reviews', null, 'hiddenReviews']] as const).map(([label, url, key]) =>
          <div key={key}>{url ? <a href={url}>{label}</a> : <span>{label}</span>}<strong>{display(data[key])}</strong></div>)}
      </div>}</Result></Panel>
    <div className="ops-grid">
      <Panel title="Financial operations"><p className="ops-note">Check reconciled payment totals and outstanding exceptions.</p>
        <div className="panel-links"><a href="/operations/finance">Open finance</a><a href="/operations/reports">Open reports</a></div></Panel>
      <Panel title="Platform health"><p className="ops-note">Review finance job health, alerts and incident state.</p>
        <div className="panel-links"><a href="/operations/monitoring">Open monitoring</a><a href="/operations/audit">Open audit log</a></div></Panel>
    </div>
  </>;
}

export async function Finance({ token }: { token: string }) {
  const result = await readAdmin<Row>(token, 'finance/summary');
  return <Result result={result} grant="finance.read">{data => <>
    <Panel title="Verified movement · NGN"><Metrics data={data} fields={amountFields} /></Panel>
    <Panel title="Open exceptions"><Metrics data={data} fields={[
      ['openReconciliationCases', 'Reconciliation cases'], ['openDisputes', 'Disputes'], ['uncertainRefunds', 'Uncertain refunds'],
    ]} /></Panel>
  </>}</Result>;
}

export async function Reports({ token, search, business }: { token: string; search: Search; business?: string }) {
  const days = ['7', '30', '90'].includes(String(search.days)) ? String(search.days) : '30';
  if (business) {
    const result = await readAdmin<Row>(token, 'reports/businesses/' + business);
    return <Panel title="Merchant performance" action={<a href="/operations/reports">Back to reports</a>}>
      <Result result={result} grant="reports.read and finance.read">{data => <>
        <div className="ops-note"><h3>{display(data.displayName)}</h3><p>{display(data.status)}</p></div>
        <Metrics data={data} fields={[['activeBranches', 'Active branches'], ['fulfilledOrders', 'Fulfilled orders'],
          ['completedReservations', 'Completed reservations'], ['linkedCustomerRides', 'Linked customer rides'],
          ['verifiedCapturedMinor', 'Verified captures', 'money'], ['processedRefundMinor', 'Processed refunds', 'money'],
          ['settledMinor', 'Settlements', 'money']]} />
      </>}</Result>
    </Panel>;
  }
  const result = await readAdmin<Row>(token, 'reports/overview?days=' + days);
  return <>
    <Panel title="Activity" action={<nav className="tabs" aria-label="Report period">
      {['7', '30', '90'].map(value => <a aria-current={days === value ? 'page' : undefined} key={value} href={'?days=' + value}>{value} days</a>)}
    </nav>}><Result result={result} grant="reports.read and finance.read">{data => <Metrics data={data} fields={reportFields} />}</Result></Panel>
    {result.data && <Panel title="Verified revenue measures · NGN"><Metrics data={result.data} fields={reportMoney} /></Panel>}
    <Panel title="Merchant report"><form className="lookup" action="/operations/reports">
      <label>Merchant ID <input name="business" pattern="[0-9a-fA-F-]{36}" required placeholder="Merchant UUID" /></label>
      <button>Find merchant</button>
    </form>{search.business !== undefined && <p className="ops-note" role="alert">Enter a valid merchant UUID.</p>}</Panel>
  </>;
}

export async function Support({ token, id, search }: { token: string; id?: string; search: Search }) {
  const offset = offsetOf(search.offset);
  if (id) {
    const result = await readAdmin<SupportDetail>(token, 'support/cases/' + id + '?' + pager(offset));
    return <Panel title="Case details" action={<a href="/operations/support">Back to support</a>}>
      <Result result={result} grant="support.read">{data => <>
        <div className="ops-note"><h3>{data.subject}</h3><p>{data.category} · {data.priority} priority · {data.status}</p>
          <p>Assigned to {data.assignedTo ?? 'no operator'}{data.resourceId && <> · Resource <code>{data.resourceId}</code></>}</p>
        </div>
        <Rows data={data.messages.items} fields={[[ 'authorKind', 'Author' ], ['body', 'Message'], ['createdAt', 'Sent', 'date']]} empty="No messages in this case." />
        <Pagination data={data.messages} offset={offset} base={'/operations/support/' + id} />
        <div className="ops-actions">
          {data.status === 'open' && <>
            <details><summary>Reply to customer</summary><CommandForm command="support-reply" label="Send reply" id={id}>
              <label>Message<textarea name="message" required maxLength={4000} rows={4} /></label>
            </CommandForm></details>
            <details><summary>Assign case</summary><CommandForm command="support-assign" label="Save assignment" id={id}>
              <label>Operator subject<input name="assignee" maxLength={255} defaultValue={data.assignedTo ?? ''} /></label>
              <p>Leave blank to unassign. Use a verified support operator subject.</p>
              <label>Priority<select name="priority" defaultValue={data.priority}><Options values={priorities} /></select></label>
              <Reason />
            </CommandForm></details>
          </>}
          <details><summary>{data.status === 'open' ? 'Close case' : 'Reopen case'}</summary>
            <CommandForm command="support-status" label={data.status === 'open' ? 'Confirm closure' : 'Confirm reopening'} id={id}
              fixed={{ status: data.status === 'open' ? 'closed' : 'open' }}><Reason /></CommandForm>
          </details>
        </div>
      </>}</Result>
    </Panel>;
  }
  const state = search.state === 'closed' ? 'closed' : 'open';
  const result = await readAdmin<Page>(token, `support/cases?state=${state}&${pager(offset)}`);
  return <Panel title="Support inbox" action={<nav className="tabs" aria-label="Case status">
    <a href="?state=open" aria-current={state === 'open' ? 'page' : undefined}>Open</a>
    <a href="?state=closed" aria-current={state === 'closed' ? 'page' : undefined}>Closed</a>
  </nav>}><Result result={result} grant="support.read">{data => <>
    <Rows data={data.items} fields={supportFields} empty={`No ${state} cases on this page.`}
      action={row => <a href={'/operations/support/' + idOf(row)} aria-label={`Open case ${row.subject}`}>Open case</a>} />
    <Pagination data={data} offset={offset} base={'/operations/support?state=' + state} />
  </>}</Result></Panel>;
}

export async function Monitoring({ token, search }: { token: string; search: Search }) {
  const offset = offsetOf(search.offset);
  const tab = search.view === 'incidents' ? 'incidents' : 'alerts';
  const [status, records] = await Promise.all([
    readAdmin<Row>(token, 'monitoring/status'),
    readAdmin<Page>(token, (tab === 'alerts' ? 'monitoring/alerts?' : 'incidents?') + pager(offset)),
  ]);
  return <>
    <Panel title="Health signals">
      <Result result={status} grant="monitoring.read">{data => <>
        <Metrics data={data} fields={monitorFields} />
        <p className="ops-note">Checked {display(data.checkedAt, 'date')} · External provider health {display(data.providerHealth)}. Stale outbox events are a diagnostic signal.</p>
        <div className="ops-actions"><CommandForm command="monitor-check" label="Run health check" /></div>
      </>}</Result>
    </Panel>
    <Panel title={tab === 'alerts' ? 'Alert inbox' : 'Incident register'} action={<nav className="tabs" aria-label="Monitoring records">
      <a href="?view=alerts" aria-current={tab === 'alerts' ? 'page' : undefined}>Alerts</a>
      <a href="?view=incidents" aria-current={tab === 'incidents' ? 'page' : undefined}>Incidents</a>
    </nav>}>
      <Result result={records} grant="monitoring.read">{data => <>
        {tab === 'incidents' && <div className="ops-actions"><details><summary>Record incident</summary>
          <CommandForm command="incident-create" label="Create incident">
            <label>Type<select name="incidentType"><Options values={incidentTypes} /></select></label>
            <label>Severity<select name="severity"><Options values={severities} /></select></label>
            <label>Resource ID (optional)<input name="resourceId" maxLength={36} /></label>
            <label>Summary<textarea name="summary" required minLength={8} maxLength={200} rows={2} /></label>
          </CommandForm>
        </details></div>}
        <Rows data={data.items} fields={tab === 'alerts' ? alertFields : incidentFields} empty={`No ${tab} on this page.`} action={row =>
          tab === 'alerts' ? (row.acknowledgedAt
            ? <span>Acknowledged {display(row.acknowledgedAt, 'date')}</span>
            : <CommandForm command="alert-acknowledge" label="Acknowledge" id={idOf(row)} />)
          : (transitions[String(row.state)] && <details><summary>Change state</summary>
            <CommandForm command="incident-status" label="Update state" id={idOf(row)}>
              <label>New state<select name="state"><Options values={transitions[String(row.state)]} /></select></label><Reason />
            </CommandForm>
          </details>)} />
        <Pagination data={data} offset={offset} base={'/operations/monitoring?view=' + tab} />
      </>}</Result>
    </Panel>
  </>;
}

export async function Audit({ token, search }: { token: string; search: Search }) {
  const offset = offsetOf(search.offset);
  const tab = search.view === 'identity' ? 'identity' : 'commands';
  const result = await readAdmin<Page>(token, (tab === 'commands' ? 'operations/command-audit?' : 'operations/audit?') + pager(offset));
  return <Panel title="Recorded activity" action={<nav className="tabs" aria-label="Audit type">
    <a href="?view=commands" aria-current={tab === 'commands' ? 'page' : undefined}>Admin activity</a>
    <a href="?view=identity" aria-current={tab === 'identity' ? 'page' : undefined}>Identity events</a>
  </nav>}>
    <Result result={result} grant="audit.read">{data => <>
      <Rows data={data.items} fields={tab === 'commands'
        ? [['operation', 'Operation'], ['outcome', 'Outcome'], ['resourceType', 'Resource type'], ['resourceId', 'Resource ID'],
          ['actorSubject', 'Actor'], ['reason', 'Reason'], ['occurredAt', 'Recorded', 'date']]
        : [['eventType', 'Event'], ['actorSubject', 'Actor'], ['occurredAt', 'Recorded', 'date']]} empty="No audit entries on this page." />
      <Pagination data={data} offset={offset} base={'/operations/audit?view=' + tab} />
    </>}</Result>
  </Panel>;
}
