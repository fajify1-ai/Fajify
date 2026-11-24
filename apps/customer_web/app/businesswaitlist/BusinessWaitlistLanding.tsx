'use client';

import Image from 'next/image';
import { useRef, useState, type FormEvent } from 'react';

const categories = [
  {
    value: 'party_event_organizer',
    number: '01',
    name: 'Party & event organizers',
    note: 'Planners, decorators and celebration experts',
  },
  {
    value: 'restaurant_lounge',
    number: '02',
    name: 'Restaurants & lounges',
    note: 'Food, drinks and memorable hospitality',
  },
  {
    value: 'event_venue',
    number: '03',
    name: 'Event venues',
    note: 'Beautiful spaces made for gathering',
  },
  {
    value: 'fun_recreation',
    number: '04',
    name: 'Fun & recreation',
    note: 'Amusement parks, games and experiences',
  },
  {
    value: 'other',
    number: '05',
    name: 'Others',
    note: 'Any other business built around good times',
  },
] as const;

type BusinessCategory = (typeof categories)[number]['value'];

function isBusinessCategory(value: string): value is BusinessCategory {
  return categories.some((category) => category.value === value);
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="10" y="14" width="44" height="40" rx="9" />
      <path d="M10 27h44M21 9v10M43 9v10m-19 22 6 6 12-14" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M11 52h43M15 45l11-12 9 6 16-21M40 18h11v11" />
    </svg>
  );
}

function ForkIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M20 8v18M14 8v12c0 5 3 8 6 8s6-3 6-8V8M20 28v28M43 56V9c7 4 9 12 9 19H43" />
    </svg>
  );
}

function BusinessWaitlistForm({
  selectedCategory,
  onCategoryChange,
}: {
  selectedCategory: BusinessCategory | '';
  onCategoryChange: (category: BusinessCategory | '') => void;
}) {
  const formRef = useRef<HTMLDivElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/platform/waitlist/business', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          businessName: data.get('businessName'),
          category: data.get('category'),
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
            : 'We could not save your details. Please check the form and try again.';
        throw new Error(detail);
      }

      form.reset();
      onCategoryChange('');
      setSubmitted(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'We could not save your details. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function addAnotherBusiness() {
    setSubmitted(false);
    setError('');
    onCategoryChange('');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <div className="business-waitlist-form-wrap" ref={formRef}>
      {submitted ? (
        <section className="business-waitlist-success" role="status" aria-live="polite">
          <span className="business-waitlist-success-icon" aria-hidden="true">
            ✓
          </span>
          <span className="business-waitlist-section-number">You’re in the family</span>
          <h3>Let’s grow something great.</h3>
          <p>
            Your business waitlist submission was successful. Thanks for your interest in
            partnering with Fajify. Our team will reach out soon.
          </p>
          <button type="button" onClick={addAnotherBusiness}>
            Add another business
          </button>
        </section>
      ) : (
        <form className="business-waitlist-form" onSubmit={handleSubmit}>
          <div className="business-waitlist-form-heading">
            <span className="business-waitlist-section-number">Tell us about your business</span>
            <span className="business-waitlist-form-badge">Fajify partner</span>
          </div>

          <label htmlFor="business-waitlist-name">Business name</label>
          <input
            id="business-waitlist-name"
            name="businessName"
            type="text"
            placeholder="Your business name"
            autoComplete="organization"
            maxLength={120}
            required
          />

          <label htmlFor="business-waitlist-category">Business category</label>
          <select
            id="business-waitlist-category"
            name="category"
            value={selectedCategory}
            onChange={(event) => {
              const value = event.target.value;
              onCategoryChange(isBusinessCategory(value) ? value : '');
            }}
            required
          >
            <option value="" disabled>
              Choose a category
            </option>
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.name}
              </option>
            ))}
          </select>

          <div className="business-waitlist-form-grid">
            <div>
              <label htmlFor="business-waitlist-email">Email address</label>
              <input
                id="business-waitlist-email"
                name="email"
                type="email"
                placeholder="you@business.com"
                autoComplete="email"
                maxLength={254}
                required
              />
            </div>
            <div>
              <label htmlFor="business-waitlist-whatsapp">WhatsApp number</label>
              <input
                id="business-waitlist-whatsapp"
                name="whatsapp"
                type="tel"
                placeholder="+234 801 234 5678"
                autoComplete="tel"
                inputMode="tel"
                maxLength={18}
                required
              />
            </div>
          </div>

          <label className="business-waitlist-consent">
            <input type="checkbox" name="consent" required />
            <span>By submitting, you agree to receive partner updates from Fajify.</span>
          </label>

          {error && (
            <p className="business-waitlist-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="business-waitlist-submit"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Register my business'}
            <ArrowIcon />
          </button>
          <p className="business-waitlist-privacy-note">
            Your details will only be used for Fajify partner updates.
          </p>
        </form>
      )}
    </div>
  );
}

export default function BusinessWaitlistLanding() {
  const [selectedCategory, setSelectedCategory] = useState<BusinessCategory | ''>('');

  function chooseCategory(category: BusinessCategory) {
    setSelectedCategory(category);
    document.getElementById('business-waitlist-partner')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }

  return (
    <main className="business-waitlist-page" id="business-waitlist-top">
      <nav className="business-waitlist-nav" aria-label="Main navigation">
        <a className="business-waitlist-brand" href="#business-waitlist-top" aria-label="Fajify partner home">
          <Image
            src="/businesswaitlist/fajify-logo-primary-horizontal.svg"
            alt="Fajify"
            width={160}
            height={60}
            priority
          />
        </a>
        <div className="business-waitlist-nav-meta">
          <span className="business-waitlist-status-dot" />
          Grow with the fam
        </div>
        <a className="business-waitlist-nav-cta" href="#business-waitlist-partner">
          Become a partner <ArrowIcon />
        </a>
      </nav>

      <section className="business-waitlist-hero" aria-labelledby="business-waitlist-title">
        <svg className="business-waitlist-journey-line" viewBox="0 0 1100 700" aria-hidden="true">
          <path d="M724 30C990 110 1000 314 814 343c-205 32-337 20-420 159-50 83 17 141 106 172" />
        </svg>
        <div className="business-waitlist-hero-copy">
          <div className="business-waitlist-eyebrow">
            <span>Fajify business partners</span>
            <span className="business-waitlist-eyebrow-line" />
            <span>Now onboarding</span>
          </div>
          <h1 id="business-waitlist-title">
            Your passion.
            <br />
            <span>Made profitable.</span>
          </h1>
          <p className="business-waitlist-hero-intro">
            Fajify helps experience-led businesses get discovered, understand their customers and
            manage every booking with less stress. You bring the good times. We’ll help you grow
            them.
          </p>
          <a className="business-waitlist-primary-button" href="#business-waitlist-partner">
            Partner with Fajify
            <span className="business-waitlist-button-arrow">
              <ArrowIcon />
            </span>
          </a>
          <p className="business-waitlist-microcopy">Early access. Real support. One growing family.</p>
        </div>

        <div className="business-waitlist-hero-visual" aria-label="A Fajify partner serving a customer">
          <div className="business-waitlist-photo">
            <Image
              src="/businesswaitlist/fajify-partner-recruitment.png"
              alt="A Fajify business partner helping a customer check in"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 58vw"
            />
          </div>
          <div className="business-waitlist-cloud business-waitlist-cloud-one" />
          <div className="business-waitlist-cloud business-waitlist-cloud-two" />
          <div className="business-waitlist-icon-card business-waitlist-calendar-card">
            <CalendarIcon />
          </div>
          <div className="business-waitlist-icon-card business-waitlist-growth-card">
            <ChartIcon />
          </div>
          <div className="business-waitlist-icon-card business-waitlist-fork-card">
            <ForkIcon />
          </div>
          <div className="business-waitlist-visual-message">
            <span className="business-waitlist-mini-label">Your business, made simpler</span>
            <strong>More visibility. More bookings. More growth.</strong>
            <div className="business-waitlist-message-pills">
              <span>Get discovered</span>
              <span>Manage bookings</span>
              <span>Know your customers</span>
            </div>
          </div>
        </div>
      </section>

      <section className="business-waitlist-categories" aria-labelledby="business-waitlist-categories-title">
        <div className="business-waitlist-categories-heading">
          <div>
            <span className="business-waitlist-section-number">01 — There’s room for you</span>
            <h2 id="business-waitlist-categories-title">
              Every type of <em>good time.</em>
            </h2>
          </div>
          <p>
            If people come to you to eat, celebrate, play or experience something memorable, your
            business belongs on Fajify.
          </p>
        </div>
        <div className="business-waitlist-category-list">
          {categories.map((category) => (
            <button
              className={`business-waitlist-category-option${selectedCategory === category.value ? ' is-selected' : ''}`}
              key={category.value}
              type="button"
              onClick={() => chooseCategory(category.value)}
              aria-pressed={selectedCategory === category.value}
            >
              <span className="business-waitlist-category-number">{category.number}</span>
              <span className="business-waitlist-category-text">
                <strong>{category.name}</strong>
                <small>{category.note}</small>
              </span>
              <span className="business-waitlist-category-arrow">
                <ArrowIcon />
              </span>
            </button>
          ))}
        </div>
        <p className="business-waitlist-category-note">Select the category that fits your business to continue.</p>
      </section>

      <section className="business-waitlist-partner" id="business-waitlist-partner">
        <svg className="business-waitlist-partner-journey" viewBox="0 0 1440 760" aria-hidden="true">
          <path d="M60 70c225 18 226 195 84 244-127 44-67 172 88 162 183-12 344-175 493-118 104 39 58 172 202 215 131 40 254-26 391 52" />
          <path className="business-waitlist-journey-arrow" d="m1284 608 24 17-29 7" />
        </svg>
        <div className="business-waitlist-partner-copy">
          <span className="business-waitlist-section-number">02 — Join the Fajify family</span>
          <h2>
            We don’t just list you. <em>We build with you.</em>
          </h2>
          <p>
            Get the tools, insights and support to run your business more easily and profitably. As
            a Fajify partner, your feedback helps shape the platform around what your business
            really needs.
          </p>
          <div className="business-waitlist-partner-points">
            <span>Simple booking tools</span>
            <span>Useful business insights</span>
            <span>A team that knows your name</span>
          </div>
        </div>

        <BusinessWaitlistForm
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      </section>

      <section className="business-waitlist-promise" aria-label="The Fajify promise">
        <p>We simplify the planning,</p>
        <p>you enjoy the moment.</p>
      </section>

      <footer className="business-waitlist-footer">
        <a href="#business-waitlist-top" aria-label="Fajify home">
          <Image
            src="/businesswaitlist/fajify-logo-white-horizontal.svg"
            alt="Fajify"
            width={132}
            height={50}
          />
        </a>
        <p>Better business. Better experiences. Together.</p>
        <div>
          <a href="https://www.instagram.com/fajify" target="_blank" rel="noreferrer">
            Instagram
          </a>
          <a href="https://www.fajify.com">fajify.com</a>
        </div>
      </footer>
    </main>
  );
}
