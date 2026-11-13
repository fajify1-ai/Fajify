'use client';

import { type FormEvent, type ReactNode, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const errors: Record<number, string> = {
  400: 'Check the values and try again.',
  403: 'Your operator account lacks permission for this action.',
  404: 'This record is no longer available.',
  409: 'The action conflicts with the current record state.',
  429: 'Too many requests. Wait before retrying.',
};

export function CommandForm({ command, label, id, fixed, children }: {
  command: string; label: string; id?: string; fixed?: Record<string, string>; children?: ReactNode;
}) {
  const router = useRouter();
  const inFlight = useRef(false);
  const previous = useRef<{ payload: string; key: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(Array.from(new FormData(form), ([name, value]) => [name, String(value).trim()]));
    const input: Record<string, unknown> = { ...values, ...fixed, ...(id && { id }) };
    if ('assignee' in input && !input.assignee) input.assignee = null;
    if ('resourceId' in input && !input.resourceId) delete input.resourceId;
    const payload = JSON.stringify(input);
    if (previous.current?.payload !== payload) previous.current = { payload, key: crypto.randomUUID() };
    const body = command === 'monitor-check' ? input : { ...input, requestKey: previous.current.key };

    inFlight.current = true;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/operations/' + command, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      });
      if (response.status === 401) {
        window.location.assign('/?auth=expired');
        return;
      }
      setFailed(!response.ok);
      if (response.ok) {
        previous.current = null;
        form.reset();
        setMessage('Saved.');
        router.refresh();
      } else {
        setMessage(errors[response.status] ?? (command === 'monitor-check'
          ? 'The check could not be confirmed. Refresh monitoring before running another check.'
          : 'The action could not be confirmed. Retry with the same values to reuse the request key.'));
      }
    } catch {
      setFailed(true);
      setMessage('The response could not be confirmed. Check your connection and the current record.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <form className="command-form" method="post" action={"/api/operations/" + command} onSubmit={submit}>
    <fieldset disabled={busy}>
      {children}
      <button type="submit">{busy ? 'Submitting…' : label}</button>
    </fieldset>
    <p role={failed ? 'alert' : 'status'}>{message}</p>
  </form>;
}
