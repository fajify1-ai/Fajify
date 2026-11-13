'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { pageSize, type Application, type Decision, type QueuePage } from '../../lib/merchant-contract';

const endpoint = '/api/merchant-applications';
const dateFormat = new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' });

function message(status: number, code: string | undefined, reviewing: boolean) {
  if (status === 403) {
    if (code === 'queue_scope_required') return 'Your account needs the governance.read grant to view this queue.';
    return reviewing ? 'Your account is forbidden from reviewing this application.' : 'Your account is forbidden from viewing the queue.';
  }
  if (status === 409 || status === 404) return 'This application is no longer available for review. The queue has been refreshed.';
  if (status === 429) return 'Too many requests. Wait a moment before trying again.';
  if (status === 400 && reviewing) return 'The API did not accept this review. Check that you are reviewing another account’s application.';
  return reviewing ? 'The result could not be confirmed. Check the refreshed queue before trying again.' : 'The pending queue could not be loaded.';
}

async function errorCode(response: Response) {
  return (await response.json().catch(() => null))?.code as string | undefined;
}

export function MerchantQueue({ expires }: { expires: number }) {
  const [page, setPage] = useState<QueuePage>();
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState('');
  const [decisionMessage, setDecisionMessage] = useState('');
  const [expired, setExpired] = useState(false);
  const [selection, setSelection] = useState<{ application: Application; decision: Decision }>();
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const queueRequest = useRef<AbortController>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const queueHeading = useRef<HTMLHeadingElement>(null);

  const expire = useCallback(() => {
    queueRequest.current?.abort();
    setExpired(true);
    setPage(undefined);
    setSelection(undefined);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(expire, Math.max(0, expires - Date.now()));
    return () => window.clearTimeout(timer);
  }, [expire, expires]);

  const load = useCallback(async (requestedOffset: number) => {
    if (Date.now() >= expires) return expire();
    queueRequest.current?.abort();
    const request = new AbortController();
    queueRequest.current = request;
    setLoading(true);
    setProblem('');
    setPage(undefined);
    try {
      let current = requestedOffset;
      while (true) {
        const response = await fetch(`${endpoint}?offset=${current}`, { cache: 'no-store', signal: request.signal });
        if (response.status === 401) return expire();
        if (!response.ok) {
          const code = await errorCode(response);
          if (!request.signal.aborted) setProblem(message(response.status, code, false));
          return;
        }
        const data: QueuePage = await response.json();
        if (request.signal.aborted) return;
        if (data.items.length || current === 0) {
          setOffset(current);
          setPage(data);
          return;
        }
        current = 0;
      }
    } catch {
      if (!request.signal.aborted) setProblem(message(503, undefined, false));
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  }, [expire, expires]);

  useEffect(() => {
    void load(0);
    return () => queueRequest.current?.abort();
  }, [load]);

  useEffect(() => {
    const modal = dialog.current;
    if (selection && !modal?.open) modal?.showModal();
    if (!selection && modal?.open) modal.close();
  }, [selection]);

  async function review() {
    if (inFlight.current || !selection) return;
    if (Date.now() >= expires) return expire();
    inFlight.current = true;
    setSaving(true);
    setDecisionMessage('');
    const { application, decision } = selection;
    let refresh = false;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: application.id, decision }),
      });
      if (response.status === 401) return expire();
      if (response.ok) {
        setDecisionMessage(`${application.displayName} was ${decision}.`);
        refresh = true;
      } else {
        const code = await errorCode(response);
        setDecisionMessage(message(response.status, code, true));
        refresh = response.status === 404 || response.status === 409 || response.status >= 500;
      }
    } catch {
      setDecisionMessage(message(503, undefined, true));
      refresh = true;
    } finally {
      setSelection(undefined);
      dialog.current?.close();
      if (refresh) {
        queueHeading.current?.focus();
        await load(offset);
      }
      setSaving(false);
      inFlight.current = false;
    }
  }

  if (expired) return (
    <section className="queue-panel access-state">
      <h2>Session expired</h2>
      <p role="status">Sign in again and complete MFA to continue reviewing applications.</p>
      <form action="/auth/login" method="post"><button className="primary">Sign in again</button></form>
    </section>
  );

  return (
    <section className="queue-panel" aria-labelledby="queue-heading">
      <div className="queue-toolbar">
        <h2 id="queue-heading" tabIndex={-1} ref={queueHeading}>Pending review</h2>
        <button onClick={() => void load(offset)} disabled={loading || saving}>Refresh queue</button>
      </div>
      <div aria-live="polite">
        {decisionMessage && <p className="notice">{decisionMessage}</p>}
        {loading && <p className="queue-state">Loading pending applications…</p>}
      </div>
      {problem && <div className="queue-state" role="alert"><p>{problem}</p><button onClick={() => void load(offset)}>Retry</button></div>}
      {page && (page.items.length ? (
        <>
          <ul className="applications">
            {page.items.map((application) => (
              <li className="application" key={application.id}>
                <div>
                  <h3>{application.displayName}</h3>
                  <p>Submitted <time dateTime={application.createdAt}>{dateFormat.format(new Date(application.createdAt))} WAT</time></p>
                  <p className="identifier">Application ID <code>{application.id}</code></p>
                </div>
                <div className="actions" role="group" aria-label={`Review ${application.displayName}`}>
                  <button disabled={saving} onClick={() => setSelection({ application, decision: 'rejected' })}>Reject</button>
                  <button disabled={saving} className="primary" onClick={() => setSelection({ application, decision: 'approved' })}>Approve</button>
                </div>
              </li>
            ))}
          </ul>
          <nav className="pagination" aria-label="Queue pages">
            <span>Showing {offset + 1}–{offset + page.items.length}</span>
            <div className="actions">
              <button disabled={!offset || saving} onClick={() => void load(Math.max(0, offset - pageSize))}>Previous</button>
              <button disabled={page.nextOffset === null || saving} onClick={() => {
                if (page.nextOffset !== null) void load(page.nextOffset);
              }}>Next</button>
            </div>
          </nav>
        </>
      ) : <p className="queue-state">There are no pending applications.</p>)}
      <dialog ref={dialog} aria-labelledby="confirm-title" aria-describedby="confirm-description"
        onCancel={(event) => {
          event.preventDefault();
          if (!inFlight.current) setSelection(undefined);
        }}>
        <h2 id="confirm-title">{selection?.decision === 'approved' ? 'Approve application?' : 'Reject application?'}</h2>
        <p id="confirm-description">
          <strong>{selection?.application.displayName}</strong>{selection?.decision === 'approved'
            ? ' will gain access to the Faji Business workspace.'
            : ' will be denied access through this application.'}
        </p>
        <div className="actions">
          <button autoFocus disabled={saving} onClick={() => setSelection(undefined)}>Cancel</button>
          <button className="primary" disabled={saving} onClick={() => void review()}>
            {saving ? 'Submitting…' : selection?.decision === 'approved' ? 'Confirm approval' : 'Confirm rejection'}
          </button>
        </div>
      </dialog>
    </section>
  );
}
