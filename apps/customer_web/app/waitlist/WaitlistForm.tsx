'use client';

import { useState, type FormEvent } from 'react';

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );
}

export default function WaitlistForm() {
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmitting(true);
    setMessage('');
    setMessageType('');
    try {
      const response = await fetch('/api/platform/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: data.get('email'),
          whatsapp: data.get('whatsapp'),
          consent: data.get('consent') === 'on',
        }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const detail =
          typeof body === 'object' &&
          body !== null &&
          'message' in body &&
          typeof body.message === 'string'
            ? body.message
            : 'We could not save your details. Please try again.';
        throw new Error(detail);
      }
      setMessage(
        'Thanks for your interest. If you have not already joined, your waitlist details are saved.',
      );
      setMessageType('success');
      form.reset();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'We could not save your details. Please try again.',
      );
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="waitlist-form" onSubmit={handleSubmit}>
      <div className="waitlist-form-heading">
        <span className="waitlist-section-label">Join the waitlist</span>
        <span className="waitlist-form-badge">Early access</span>
      </div>
      <label htmlFor="waitlist-email">Email address</label>
      <input
        id="waitlist-email"
        name="email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        maxLength={254}
        required
      />
      <label htmlFor="waitlist-whatsapp">WhatsApp number</label>
      <div className="waitlist-phone-field">
        <span aria-label="Country code">+234</span>
        <input
          id="waitlist-whatsapp"
          name="whatsapp"
          type="tel"
          placeholder="801 234 5678"
          autoComplete="tel-national"
          inputMode="tel"
          maxLength={18}
          required
        />
      </div>
      <label className="waitlist-consent">
        <input type="checkbox" name="consent" required />
        <span>
          I agree Fajify may contact me by email and WhatsApp about early access
          and launch updates.
        </span>
      </label>
      <button className="waitlist-submit" type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : 'Save my spot'} <ArrowIcon />
      </button>
      {message ? (
        <p
          className={`waitlist-form-message waitlist-form-message-${messageType}`}
          role={messageType === 'error' ? 'alert' : 'status'}
        >
          {message}
        </p>
      ) : (
        <p className="waitlist-privacy-note">
          Your contact details will be used only for Fajify early-access and
          launch updates. Consent is required to join.
        </p>
      )}
    </form>
  );
}
