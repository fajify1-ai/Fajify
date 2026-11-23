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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(
      'Waitlist signup is not connected yet. Your details have not been sent or saved.',
    );
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
      <button className="waitlist-submit" type="submit">
        Save my spot <ArrowIcon />
      </button>
      {message ? (
        <p className="waitlist-form-message" role="status">
          {message}
        </p>
      ) : (
        <p className="waitlist-privacy-note">
          Waitlist sign-up isn’t active yet. Your details won’t be sent or
          saved.
        </p>
      )}
    </form>
  );
}
