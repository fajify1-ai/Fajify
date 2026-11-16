import { useState, useRef } from 'react'
import { useDarkMode } from '../store/darkMode'

type Props = { onComplete: (draft?: {businessName:string}) => void | Promise<void>; onBack: () => void; connected?: boolean; submitting?: boolean }

const AMBER = '#D92D27'

const CATEGORIES = [
  { id: 'restaurant', emoji: '🍽', label: 'Restaurant / Bar',       sub: 'Dine-in, takeout, cocktail bar' },
  { id: 'hotel',      emoji: '🏨', label: 'Hotel / Resort',         sub: 'Accommodation & hospitality' },
  { id: 'venue',      emoji: '🎪', label: 'Event Venue',            sub: 'Weddings, concerts, private events' },
  { id: 'spa',        emoji: '💆', label: 'Spa & Wellness',         sub: 'Beauty, massage, grooming' },
  { id: 'cinema',     emoji: '🎬', label: 'Cinema & Entertainment', sub: 'Movies, comedy shows, gaming' },
  { id: 'retail',     emoji: '🛍', label: 'Retail / Shop',          sub: 'Fashion, gifts, lifestyle goods' },
  { id: 'park',       emoji: '🌳', label: 'Park / Outdoor',         sub: 'Nature, beach, adventure' },
  { id: 'other',      emoji: '✦',  label: 'Other',                  sub: "Something we haven't listed" },
]

const SERVICES = [
  { id: 'reservations', label: 'Table / Seat Reservations' },
  { id: 'ordering',     label: 'In-venue Ordering' },
  { id: 'tickets',      label: 'Event Tickets' },
  { id: 'delivery',     label: 'Delivery & Takeout' },
  { id: 'transport',    label: 'Customer Transport (fajify Ride)' },
  { id: 'loyalty',      label: 'Loyalty & Rewards' },
  { id: 'packages',     label: 'Curated Date Packages' },
  { id: 'gifting',      label: 'Gifting & Add-ons' },
]

const SCALES = [
  { id: 'solo',       label: 'Solo / Micro',   sub: '1–5 staff, single location',    emoji: '👤' },
  { id: 'small',      label: 'Small',          sub: '5–30 staff, 1–3 locations',     emoji: '🏠' },
  { id: 'medium',     label: 'Medium',         sub: '30–100 staff, multiple sites',  emoji: '🏢' },
  { id: 'enterprise', label: 'Enterprise',     sub: '100+ staff, chain or franchise', emoji: '🌐' },
]

const ID_TYPES = ['National ID (NIN)', 'International Passport', "Driver's License", 'Corporate Registration (CAC)']

const TOTAL_STEPS = 8
const STEP_LABELS  = ['Business Type', 'Services', 'Scale', 'Your Details', 'Business Info', 'Verification', 'Location', 'Review']

// ── Shared style bag ──────────────────────────────────────────────────────────

interface S {
  bg: string; surface: string; ink: string; muted: string
  border: string; inputBg: string; subBg: string; dark: boolean
}

// ── Dummy map (street-grid SVG) ───────────────────────────────────────────────

function DummyMap({ accent, dark, height = 160 }: { accent: string; dark: boolean; height?: number }) {
  const road  = dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)'
  const block = dark ? '#141820'                 : '#DDEAE0'
  const bg2   = dark ? '#1A2030'                 : '#E4EEF0'
  const park  = dark ? '#142014'                 : '#C8DCB8'
  return (
    <svg width="100%" height={height} viewBox="0 0 380 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="380" height="160" fill={bg2}/>
      {/* Horizontal roads */}
      <rect x="0"   y="36"  width="380" height="9" fill={road}/>
      <rect x="0"   y="74"  width="380" height="9" fill={road}/>
      <rect x="0"   y="114" width="380" height="11" fill={road}/>
      {/* Vertical roads */}
      <rect x="62"  y="0"   width="9" height="160" fill={road}/>
      <rect x="136" y="0"   width="9" height="160" fill={road}/>
      <rect x="210" y="0"   width="11" height="160" fill={road}/>
      <rect x="292" y="0"   width="9" height="160" fill={road}/>
      {/* City blocks */}
      <rect x="0"   y="0"   width="62"  height="36"  fill={block} rx="2"/>
      <rect x="71"  y="0"   width="65"  height="36"  fill={block} rx="2"/>
      <rect x="145" y="0"   width="65"  height="36"  fill={block} rx="2"/>
      <rect x="221" y="0"   width="71"  height="36"  fill={block} rx="2"/>
      <rect x="301" y="0"   width="79"  height="36"  fill={block} rx="2"/>
      <rect x="0"   y="45"  width="62"  height="29"  fill={block} rx="2"/>
      <rect x="71"  y="45"  width="65"  height="29"  fill={park}  rx="2"/>
      <rect x="145" y="45"  width="65"  height="29"  fill={block} rx="2"/>
      <rect x="221" y="45"  width="71"  height="29"  fill={block} rx="2"/>
      <rect x="301" y="45"  width="79"  height="29"  fill={block} rx="2"/>
      <rect x="0"   y="83"  width="62"  height="31"  fill={block} rx="2"/>
      <rect x="71"  y="83"  width="65"  height="31"  fill={block} rx="2"/>
      <rect x="145" y="83"  width="65"  height="31"  fill={block} rx="2"/>
      <rect x="221" y="83"  width="71"  height="31"  fill={park}  rx="2"/>
      <rect x="301" y="83"  width="79"  height="31"  fill={block} rx="2"/>
      <rect x="0"   y="125" width="62"  height="35"  fill={block} rx="2"/>
      <rect x="71"  y="125" width="65"  height="35"  fill={park}  rx="2"/>
      <rect x="145" y="125" width="65"  height="35"  fill={block} rx="2"/>
      <rect x="221" y="125" width="71"  height="35"  fill={block} rx="2"/>
      <rect x="301" y="125" width="79"  height="35"  fill={block} rx="2"/>
      {/* Location pulse */}
      <circle cx="190" cy="80" r="22" fill={accent} opacity="0.15"/>
      <circle cx="190" cy="80" r="13" fill={accent} opacity="0.25"/>
      <circle cx="190" cy="80" r="6"  fill={accent}/>
      <ellipse cx="190" cy="97" rx="5" ry="2" fill="rgba(0,0,0,0.18)"/>
    </svg>
  )
}

// ── StepHeader — module-level so React never unmounts it on state change ──────

function StepHeader({ step, s, onPrev }: { step: number; s: S; onPrev: () => void }) {
  return (
    <div className="sticky top-0 z-10 px-5 pt-14 pb-4" style={{ background: s.bg }}>
      <div className="flex items-center gap-2 mb-5">
        <button onClick={onPrev}
          className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: s.surface, border: `1px solid ${s.border}` }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={s.ink} strokeWidth="2.2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden"
          style={{ background: s.dark ? '#222' : '#E8E8E8' }}>
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%`, background: AMBER }} />
        </div>
        <span className="text-[11px] font-black shrink-0" style={{ color: s.muted }}>
          {step}/{TOTAL_STEPS}
        </span>
      </div>
      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: AMBER }}>
        {STEP_LABELS[step - 1]}
      </p>
    </div>
  )
}

// ── Field — module-level so inputs keep focus across re-renders ───────────────

function Field({ label, value, onChange, placeholder, type = 'text', s }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; s: S
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: s.muted }}>
        {label}
      </p>
      <input
        aria-label={label} type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-[14px] px-4 py-3.5 text-[14px] font-medium outline-none border"
        style={{ background: s.inputBg, borderColor: s.border, color: s.ink }}
      />
    </div>
  )
}

// ── Continue button (module-level so it doesn't remount on state change) ──────

function Cta({ label, action, disabled, bg }: { label: string; action: () => void; disabled: boolean; bg: string }) {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 pb-10 pt-3 md:max-w-[720px]"
      style={{ background: bg }}>
      <button onClick={action} disabled={disabled}
        className="w-full rounded-[18px] py-4 text-[15px] font-black text-white transition-opacity"
        style={{ background: AMBER, opacity: disabled ? 0.35 : 1 }}>
        {label}
      </button>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function BusinessOnboardingScreen({ onComplete, onBack, connected = false, submitting = false }: Props) {
  const { dark } = useDarkMode()

  const [step, setStep] = useState(1)

  const [category,    setCategory]    = useState('')
  const [services,    setServices]    = useState<string[]>([])
  const [scale,       setScale]       = useState('')
  const [fullName,    setFullName]    = useState('')
  const [email,       setEmail]       = useState('')
  const [phone,       setPhone]       = useState('')
  const [bizName,     setBizName]     = useState('')
  const [regNum,      setRegNum]      = useState('')
  const [bizAddr,     setBizAddr]     = useState('')
  const [idType,      setIdType]      = useState('')
  const [idUploaded,  setIdUploaded]  = useState(false)
  const [faceScanned, setFaceScanned] = useState(false)
  const [city,        setCity]        = useState('Lagos')
  const [lga,         setLga]         = useState('')
  const [landmark,    setLandmark]    = useState('')

  const fileRef = useRef<HTMLInputElement>(null)

  const s: S = {
    bg:      dark ? '#080808' : '#F8F8F8',
    surface: dark ? '#1A1A1A' : '#FFFFFF',
    ink:     dark ? '#F0F0F0' : '#1A1A1A',
    muted:   dark ? '#AAA'    : '#666666',
    border:  dark ? '#2A2A2A' : '#EEEEEE',
    inputBg: dark ? '#222'    : '#F4F4F6',
    subBg:   dark ? '#141414' : '#F0F0F4',
    dark,
  }

  const toggleService = (id: string) =>
    setServices(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const canAdvance = () => {
    if (step === 1) return !!category
    if (step === 2) return services.length > 0
    if (step === 3) return !!scale
    if (step === 4) return !!(fullName.trim() && email.trim() && phone.trim())
    if (step === 5) return !!(bizName.trim() && bizAddr.trim())
    if (step === 6) return connected || !!(idType && idUploaded && faceScanned)
    if (step === 7) return !!lga.trim()
    return true
  }

  const next = () => { if (step < TOTAL_STEPS) setStep(n => n + 1) }
  const prev = () => { if (step > 1) setStep(n => n - 1); else onBack() }

  const wrap = (children: React.ReactNode) => (
    <div className="business-onboarding min-h-screen w-full font-[family-name:var(--font-ui)]"
      style={{ background: s.bg }}>
      <StepHeader step={step} s={s} onPrev={prev} />
      {children}
    </div>
  )

  // ── STEP 1: Category ──────────────────────────────────────────────────────────
  if (step === 1) return wrap(
    <>
      <div className="px-5 pb-4">
        <h1 className="text-[26px] font-black leading-tight mb-1" style={{ color: s.ink }}>
          What best describes<br/>your business?
        </h1>
        <p className="text-[13px]" style={{ color: s.muted }}>We'll tailor your fajify experience around this.</p>
      </div>
      <div className="px-5 pb-36 grid grid-cols-2 gap-3 md:grid-cols-4 md:px-10 lg:px-16">
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setCategory(c.id)}
            className="rounded-[20px] p-4 text-left transition-all"
            style={{
              background: category === c.id ? AMBER + '15' : s.surface,
              border: `2px solid ${category === c.id ? AMBER : s.border}`,
            }}>
            <p className="text-[28px] mb-2">{c.emoji}</p>
            <p className="text-[13px] font-black leading-tight" style={{ color: s.ink }}>{c.label}</p>
            <p className="text-[11px] mt-0.5 leading-snug" style={{ color: s.muted }}>{c.sub}</p>
          </button>
        ))}
      </div>
      <Cta label="Continue" action={next} disabled={!canAdvance()} bg={s.bg} />
    </>
  )

  // ── STEP 2: Services ──────────────────────────────────────────────────────────
  if (step === 2) return wrap(
    <>
      <div className="px-5 pb-4">
        <h1 className="text-[26px] font-black leading-tight mb-1" style={{ color: s.ink }}>
          What will you offer<br/>through fajify?
        </h1>
        <p className="text-[13px]" style={{ color: s.muted }}>Select all that apply. You can change this later.</p>
      </div>
      <div className="px-5 pb-36 flex flex-col gap-2.5">
        {SERVICES.map(svc => {
          const active = services.includes(svc.id)
          return (
            <button key={svc.id} onClick={() => toggleService(svc.id)}
              className="flex items-center gap-4 rounded-[16px] px-4 py-4 text-left transition-all"
              style={{
                background: active ? AMBER + '12' : s.surface,
                border: `1.5px solid ${active ? AMBER : s.border}`,
              }}>
              <div className="h-5 w-5 rounded-[6px] flex items-center justify-center shrink-0 transition-all"
                style={{
                  background: active ? AMBER : (s.dark ? '#2A2A2A' : '#EEEEEE'),
                  border: `1.5px solid ${active ? AMBER : s.border}`,
                }}>
                {active && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
              <p className="text-[14px] font-semibold" style={{ color: s.ink }}>{svc.label}</p>
            </button>
          )
        })}
      </div>
      <Cta label={`Continue — ${services.length} selected`} action={next} disabled={!canAdvance()} bg={s.bg} />
    </>
  )

  // ── STEP 3: Scale ─────────────────────────────────────────────────────────────
  if (step === 3) return wrap(
    <>
      <div className="px-5 pb-4">
        <h1 className="text-[26px] font-black leading-tight mb-1" style={{ color: s.ink }}>
          How big is your<br/>operation?
        </h1>
        <p className="text-[13px]" style={{ color: s.muted }}>This helps us recommend the right plan for you.</p>
      </div>
      <div className="px-5 pb-36 flex flex-col gap-3">
        {SCALES.map(sc => (
          <button key={sc.id} onClick={() => setScale(sc.id)}
            className="flex items-center gap-4 rounded-[20px] px-5 py-4 text-left transition-all"
            style={{
              background: scale === sc.id ? AMBER + '12' : s.surface,
              border: `2px solid ${scale === sc.id ? AMBER : s.border}`,
            }}>
            <p className="text-[28px]">{sc.emoji}</p>
            <div className="flex-1">
              <p className="text-[15px] font-black" style={{ color: scale === sc.id ? AMBER : s.ink }}>{sc.label}</p>
              <p className="text-[12px] mt-0.5" style={{ color: s.muted }}>{sc.sub}</p>
            </div>
            {scale === sc.id && (
              <div className="h-6 w-6 rounded-full flex items-center justify-center" style={{ background: AMBER }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
      <Cta label="Continue" action={next} disabled={!canAdvance()} bg={s.bg} />
    </>
  )

  // ── STEP 4: Contact info ──────────────────────────────────────────────────────
  if (step === 4) return wrap(
    <>
      <div className="px-5 pb-4">
        <h1 className="text-[26px] font-black leading-tight mb-1" style={{ color: s.ink }}>
          Tell us about<br/>yourself
        </h1>
        <p className="text-[13px]" style={{ color: s.muted }}>This is the primary contact for this business account.</p>
      </div>
      <div className="px-5 pb-36 flex flex-col gap-3.5">
        <Field label="Full Name"     value={fullName} onChange={setFullName} placeholder="Ada Okafor"          s={s} />
        <Field label="Email Address" value={email}    onChange={setEmail}    placeholder="ada@business.com" type="email" s={s} />
        <Field label="Phone Number"  value={phone}    onChange={setPhone}    placeholder="+234 801 234 5678" type="tel"   s={s} />
        <div className="rounded-[16px] p-4" style={{ background: s.subBg, border: `1px solid ${s.border}` }}>
          <p className="text-[12px] font-medium leading-relaxed" style={{ color: s.muted }}>
            Preview only. No verification email will be sent; use sample contact details.
          </p>
        </div>
      </div>
      <Cta label="Continue" action={next} disabled={!canAdvance()} bg={s.bg} />
    </>
  )

  // ── STEP 5: Business info ─────────────────────────────────────────────────────
  if (step === 5) return wrap(
    <>
      <div className="px-5 pb-4">
        <h1 className="text-[26px] font-black leading-tight mb-1" style={{ color: s.ink }}>
          Your business<br/>details
        </h1>
        <p className="text-[13px]" style={{ color: s.muted }}>This appears on your fajify listing for customers to see.</p>
      </div>
      <div className="px-5 pb-36 flex flex-col gap-3.5">
        <Field label="Business Name"                       value={bizName} onChange={setBizName} placeholder="e.g. Shiro Lagos"               s={s} />
        <Field label="CAC / Registration Number (optional)" value={regNum}  onChange={setRegNum}  placeholder="RC-123456"                       s={s} />
        <Field label="Business Address"                    value={bizAddr} onChange={setBizAddr} placeholder="12 Admiralty Way, Lekki, Lagos" s={s} />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: s.muted }}>
            Category (from earlier)
          </p>
          <div className="rounded-[14px] px-4 py-3.5 flex items-center gap-3"
            style={{ background: AMBER + '12', border: `1.5px solid ${AMBER}40` }}>
            <p className="text-[22px]">{CATEGORIES.find(c => c.id === category)?.emoji}</p>
            <div>
              <p className="text-[14px] font-black" style={{ color: AMBER }}>
                {CATEGORIES.find(c => c.id === category)?.label}
              </p>
              <button onClick={() => setStep(1)} className="text-[11px] font-medium" style={{ color: s.muted }}>
                Change →
              </button>
            </div>
          </div>
        </div>
      </div>
      <Cta label="Continue" action={next} disabled={!canAdvance()} bg={s.bg} />
    </>
  )

  // ── STEP 6: Identity verification ─────────────────────────────────────────────
  if (step === 6 && connected) return wrap(<div className="px-5 pb-40"><h1 className="text-2xl font-bold mb-5">Identity verification</h1><p>Identity document and selfie verification are not connected. Do not upload sensitive documents here.</p><p className="mt-4">Only your business name will be submitted. Other details remain an unsent draft.</p><Cta label="Continue with application draft" action={next} disabled={false} bg={s.bg}/></div>)
  if (step === 6) return wrap(
    <>
      <div className="px-5 pb-4">
        <h1 className="text-[26px] font-black leading-tight mb-1" style={{ color: s.ink }}>
          Verify your<br/>identity
        </h1>
        <p className="text-[13px]" style={{ color: s.muted }}>Required to keep fajify safe for everyone.</p>
      </div>
      <div className="px-5 pb-36 flex flex-col gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: s.muted }}>ID Type</p>
          <div className="flex flex-col gap-2">
            {ID_TYPES.map(t => (
              <button key={t} onClick={() => setIdType(t)}
                className="flex items-center gap-3 rounded-[14px] px-4 py-3.5 text-left"
                style={{
                  background: idType === t ? AMBER + '12' : s.surface,
                  border: `1.5px solid ${idType === t ? AMBER : s.border}`,
                }}>
                <div className="h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: idType === t ? AMBER : s.muted }}>
                  {idType === t && <div className="h-2.5 w-2.5 rounded-full" style={{ background: AMBER }} />}
                </div>
                <p className="text-[13px] font-semibold" style={{ color: s.ink }}>{t}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: s.muted }}>
            Upload ID Document
          </p>
          <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
            onChange={() => setIdUploaded(true)} />
          <button onClick={() => setIdUploaded(true)}
            className="w-full rounded-[18px] py-5 flex flex-col items-center justify-center gap-2 transition-all"
            style={{
              background: idUploaded ? '#22C55E15' : s.surface,
              border: `2px dashed ${idUploaded ? '#22C55E' : s.border}`,
            }}>
            {idUploaded ? (
              <>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <p className="text-[13px] font-black" style={{ color: '#22C55E' }}>Sample document selected ✓</p>
                <p className="text-[11px]" style={{ color: s.muted }}>Tap to replace</p>
              </>
            ) : (
              <>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={s.muted} strokeWidth="1.8">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <p className="text-[13px] font-black" style={{ color: s.ink }}>Use sample {idType || 'ID'}</p>
                <p className="text-[11px]" style={{ color: s.muted }}>Simulated verification · No real identity document is needed</p>
              </>
            )}
          </button>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: s.muted }}>Face Selfie</p>
          <button onClick={() => setFaceScanned(v => !v)}
            className="w-full rounded-[18px] py-5 flex flex-col items-center justify-center gap-2 transition-all"
            style={{
              background: faceScanned ? '#22C55E15' : s.surface,
              border: `2px dashed ${faceScanned ? '#22C55E' : s.border}`,
            }}>
            {faceScanned ? (
              <>
                <span className="text-[32px]">🤳</span>
                <p className="text-[13px] font-black" style={{ color: '#22C55E' }}>Selfie simulation complete ✓</p>
                <p className="text-[11px]" style={{ color: s.muted }}>Tap to retake</p>
              </>
            ) : (
              <>
                <span className="text-[32px]">📸</span>
                <p className="text-[13px] font-black" style={{ color: s.ink }}>Take a selfie</p>
                <p className="text-[11px]" style={{ color: s.muted }}>Clear face, good lighting</p>
              </>
            )}
          </button>
        </div>

        <div className="rounded-[16px] p-4" style={{ background: s.subBg, border: `1px solid ${s.border}` }}>
          <p className="text-[12px] font-medium leading-relaxed" style={{ color: s.muted }}>
            Simulation only. No real document, selfie, camera or identity verification service is used.
          </p>
        </div>
      </div>
      <Cta label="Continue" action={next} disabled={!canAdvance()} bg={s.bg} />
    </>
  )

  // ── STEP 7: Location ──────────────────────────────────────────────────────────
  if (step === 7) return wrap(
    <>
      <div className="px-5 pb-4">
        <h1 className="text-[26px] font-black leading-tight mb-1" style={{ color: s.ink }}>
          Where are you<br/>located?
        </h1>
        <p className="text-[13px]" style={{ color: s.muted }}>Customers nearby will discover you on fajify.</p>
      </div>
      <div className="px-5 pb-36 flex flex-col gap-4">
        <div className="relative rounded-[20px] overflow-hidden" style={{ height: 160 }}>
          <DummyMap accent={AMBER} dark={s.dark} height={160} />
          <div className="absolute inset-0 flex items-end justify-end p-3">
            <button onClick={() => setLandmark('Demo location selected')} className="rounded-full px-3 py-2 text-[11px] font-black text-white flex items-center gap-1.5 backdrop-blur-sm"
              style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
              </svg>
              Use my location
            </button>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: s.muted }}>City</p>
          <div className="flex gap-2 flex-wrap">
            {['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan'].map(c => (
              <button key={c} onClick={() => setCity(c)}
                className="rounded-full px-4 py-2 text-[12px] font-bold transition-all"
                style={{
                  background: city === c ? AMBER : s.surface,
                  color: city === c ? '#fff' : s.ink,
                  border: `1.5px solid ${city === c ? AMBER : s.border}`,
                }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <Field label="LGA / Area"        value={lga}      onChange={setLga}      placeholder="e.g. Victoria Island, Lekki Phase 1" s={s} />
        <Field label="Closest Landmark"  value={landmark} onChange={setLandmark} placeholder="e.g. Near Eko Hotel"                 s={s} />
      </div>
      <Cta label="Continue" action={next} disabled={!canAdvance()} bg={s.bg} />
    </>
  )

  // ── STEP 8: Review & Submit ───────────────────────────────────────────────────
  const catObj   = CATEGORIES.find(c => c.id === category)
  const scaleObj = SCALES.find(sc => sc.id === scale)

  return wrap(
    <>
      <div className="px-5 pb-4">
        <h1 className="text-[26px] font-black leading-tight mb-1" style={{ color: s.ink }}>
          Review your<br/>application
        </h1>
        <p className="text-[13px]" style={{ color: s.muted }}>Check everything looks right before submitting.</p>
      </div>

      <div className="px-5 pb-36 flex flex-col gap-3">
        {[
          { title: 'Business Type', step: 1, content: catObj   ? `${catObj.emoji} ${catObj.label}`     : '—' },
          { title: 'Services',      step: 2, content: services.length > 0 ? services.map(id => SERVICES.find(sv => sv.id === id)?.label).join(', ') : '—' },
          { title: 'Scale',         step: 3, content: scaleObj ? `${scaleObj.emoji} ${scaleObj.label}` : '—' },
          { title: 'Contact',       step: 4, content: [fullName, email, phone].filter(Boolean).join(' · ') || '—' },
          { title: 'Business',      step: 5, content: [bizName, bizAddr].filter(Boolean).join(' — ')    || '—' },
          { title: 'Verification',  step: 6, content: connected ? 'Not connected — approval required' : idType && idUploaded && faceScanned ? `${idType} · Selfie` : 'Incomplete' },
          { title: 'Location',      step: 7, content: [city, lga, landmark].filter(Boolean).join(', ') || '—' },
        ].map(row => (
          <div key={row.title} className="rounded-[18px] p-4 flex items-start justify-between gap-3"
            style={{ background: s.surface, border: `1px solid ${s.border}` }}>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: s.muted }}>{row.title}</p>
              <p className="text-[13px] font-semibold leading-snug" style={{ color: s.ink }}>{row.content}</p>
            </div>
            <button onClick={() => setStep(row.step)}
              className="text-[11px] font-black shrink-0 mt-0.5" style={{ color: AMBER }}>
              Edit
            </button>
          </div>
        ))}

        <div className="rounded-[18px] p-4" style={{ background: AMBER + '10', border: `1px solid ${AMBER}30` }}>
          <p className="text-[12px] font-medium leading-relaxed" style={{ color: s.ink }}>
            {connected ? 'Submitting sends your business name for approval. Contact, location and service details above remain an unsent draft until the onboarding contract supports them. No verification or approval is implied.' : 'Local preview only. Submitting opens the merchant demo without sending an application or email.'}
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 pb-10 pt-3 md:max-w-[720px]"
        style={{ background: s.bg }}>
        <button disabled={submitting} onClick={() => onComplete({businessName:bizName})}
          className="w-full rounded-[18px] py-4 text-[15px] font-black text-white"
          style={{ background: AMBER, boxShadow: '0 8px 32px rgba(250,63,56,0.3)' }}>
          {submitting ? 'Submitting…' : 'Submit Application'}
        </button>
        <p className="text-center text-[11px] mt-3" style={{ color: s.muted }}>
          {connected ? 'The server decides approval. Only the business name is submitted.' : 'Demo submission only. No application or identity is sent.'}
        </p>
      </div>
    </>
  )
}
