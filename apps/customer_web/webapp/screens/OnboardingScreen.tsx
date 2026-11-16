import type { NavigateFn } from '../App'

type Props = { navigate: NavigateFn }

export default function OnboardingScreen({ navigate }: Props) {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      minHeight: '100vh',
      maxWidth: 430,
      margin: '0 auto',
      overflow: 'hidden',
      fontFamily: "'Montserrat:Regular', sans-serif",
    }}>
      {/* Background photo — couple silhouette at sunset */}
      <img
        src="/reference/dd9d5ad6b2fe0226.jpg"
        alt="Couple dancing at sunset"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* Gradient overlay — dark at top for status bar, deep at bottom for CTA */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(20,10,6,0.45) 0%, transparent 30%, transparent 50%, rgba(20,10,6,0.85) 80%, rgba(20,10,6,0.97) 100%)',
      }} />

      {/* Status bar mock */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px 0' }}>
        <span style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>9:41</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ color: '#fff', fontSize: 13 }}>▌▌▌▌</span>
          <span style={{ color: '#fff', fontSize: 13 }}>WiFi</span>
          <span style={{ color: '#fff', fontSize: 13 }}></span>
        </div>
      </div>

      {/* Logo / brand */}
      <div style={{ position: 'relative', zIndex: 2, padding: '32px 28px 0', textAlign: 'left' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', borderRadius: 999, padding: '6px 16px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <span style={{ fontSize: 18 }}></span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: '0.02em' }}>Lovie</span>
        </div>
      </div>

      {/* Bottom content */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2, padding: '0 28px 52px' }}>
        {/* Tag line */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {[' Restaurants', ' Parks', ' Events'].map(tag => (
            <span key={tag} style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.13)', borderRadius: 999, padding: '5px 12px', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)', whiteSpace: 'nowrap' }}>
              {tag}
            </span>
          ))}
        </div>

        <h1 style={{
          margin: '0 0 12px',
          fontSize: 36,
          fontWeight: 800,
          fontFamily: "'Montserrat:Bold', sans-serif",
          color: '#fff',
          lineHeight: 1.15,
          letterSpacing: '-0.01em',
        }}>
          Your Dream Date<br />Starts Here
        </h1>

        <p style={{ margin: '0 0 32px', fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, maxWidth: 300 }}>
          Discover handpicked restaurants, venues, and experiences — designed for unforgettable moments together.
        </p>

        {/* CTA button */}
        <button aria-label="Back to discovery"
          onClick={() => navigate({ name: 'home' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            width: '100%',
            padding: '17px 24px',
            borderRadius: 999,
            border: 'none',
            background: '#fff',
            color: '#1F1F1F',
            fontSize: 16,
            fontWeight: 800,
            cursor: 'pointer',
            fontFamily: "'Montserrat:Regular', sans-serif",
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          }}
        >
          Plan Your Perfect Date
          <span style={{ fontSize: 20 }}>→</span>
        </button>

        <p style={{ margin: '16px 0 0', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          Already have an account?{' '}
          <span
            onClick={() => navigate({ name: 'home' })}
            style={{ color: '#fff', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Sign in
          </span>
        </p>
      </div>
    </div>
  )
}
