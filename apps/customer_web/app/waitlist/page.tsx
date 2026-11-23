import Image from 'next/image';
import WaitlistForm from './WaitlistForm';

export const metadata = {
  title: 'Get early access | Fajify',
  description:
    'Discover great restaurants, exciting events and unforgettable experiences with Fajify. Join the waitlist for early access.',
};

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

function PinIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 56s17-15 17-31a17 17 0 1 0-34 0c0 16 17 31 17 31Z" />
      <circle cx="32" cy="25" r="6" />
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

function CarIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="m13 33 5-14c1-3 4-5 7-5h14c3 0 6 2 7 5l5 14M11 33h42c3 0 5 2 5 5v11H6V38c0-3 2-5 5-5ZM11 49v6M53 49v6M15 40h7M42 40h7" />
    </svg>
  );
}

export default function WaitlistPage() {
  return (
    <main className="waitlist-page" id="top">
      <nav className="waitlist-nav" aria-label="Main navigation">
        <a className="waitlist-brand" href="#top" aria-label="Fajify home">
          <Image
            src="/waitlist/fajify-logo-primary-horizontal.svg"
            alt="Fajify"
            width={164}
            height={48}
            priority
          />
        </a>
        <p className="waitlist-nav-motto">
          <span className="waitlist-status-dot" />
          Plan less. Live more.
        </p>
        <a className="waitlist-nav-cta" href="#waitlist">
          Join the waitlist <ArrowIcon />
        </a>
      </nav>

      <section className="waitlist-hero" aria-labelledby="waitlist-hero-title">
        <svg className="waitlist-hero-path" viewBox="0 0 1100 700" aria-hidden="true">
          <path d="M724 30C990 110 1000 314 814 343c-205 32-337 20-420 159-50 83 17 141 106 172" />
        </svg>
        <div className="waitlist-hero-copy">
          <div className="waitlist-eyebrow">
            <span>First access</span>
            <span className="waitlist-eyebrow-line" />
            <span>Coming soon</span>
          </div>
          <h1 id="waitlist-hero-title">
            Good times.
            <br />
            <span>Made simple.</span>
          </h1>
          <p className="waitlist-hero-intro">
            Discover great restaurants, exciting events and unforgettable
            experiences — then plan your ride there. One app, one easy plan.
          </p>
          <a className="waitlist-primary-cta" href="#waitlist">
            Get early access
            <span className="waitlist-button-arrow">
              <ArrowIcon />
            </span>
          </a>
          <p className="waitlist-microcopy">Free to join. No spam, ever.</p>
        </div>

        <div className="waitlist-hero-visual" aria-hidden="true">
          <div className="waitlist-photo" />
          <div className="waitlist-icon-card waitlist-car-card">
            <CarIcon />
          </div>
          <div className="waitlist-icon-card waitlist-calendar-card">
            <CalendarIcon />
          </div>
          <div className="waitlist-icon-card waitlist-pin-card">
            <PinIcon />
          </div>
          <div className="waitlist-icon-card waitlist-fork-card">
            <ForkIcon />
          </div>
          <div className="waitlist-visual-message">
            <span className="waitlist-mini-label">Your next good time</span>
            <strong>Found. Planned. Booked.</strong>
            <div className="waitlist-pills">
              <span>Eat</span>
              <span>Go out</span>
              <span>Experience</span>
              <span>Get a ride</span>
            </div>
          </div>
        </div>
      </section>

      <section className="waitlist-signup" id="waitlist" aria-labelledby="waitlist-title">
        <svg className="waitlist-signup-path" viewBox="0 0 1440 760" aria-hidden="true">
          <path d="M60 70c225 18 226 195 84 244-127 44-67 172 88 162 183-12 344-175 493-118 104 39 58 172 202 215 131 40 254-26 391 52" />
          <path className="waitlist-path-arrow" d="m1284 608 24 17-29 7" />
        </svg>
        <div className="waitlist-signup-copy">
          <span className="waitlist-section-label">01 — The first fam</span>
          <h2 id="waitlist-title">
            Not everyone gets in early. <em>You do.</em>
          </h2>
          <p>
            Be among the first to discover and book the best places and
            experiences around you. The waitlist opens soon—check back here to
            save your spot.
          </p>
        </div>
        <WaitlistForm />
      </section>

      <section className="waitlist-promise" aria-label="The Fajify promise">
        <p>We simplify the planning,</p>
        <p>you enjoy the moment.</p>
      </section>

      <footer className="waitlist-footer">
        <a href="#top" aria-label="Fajify home">
          <Image
            src="/waitlist/fajify-logo-white-horizontal.svg"
            alt="Fajify"
            width={140}
            height={42}
          />
        </a>
        <p>Good times, thoughtfully planned.</p>
        <div className="waitlist-footer-links">
          <a href="https://www.instagram.com/fajify" target="_blank" rel="noreferrer">
            Instagram
          </a>
          <a href="https://www.fajify.com" target="_blank" rel="noreferrer">
            fajify.com
          </a>
        </div>
      </footer>
    </main>
  );
}
