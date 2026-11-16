import { useEffect, useState } from 'react'

type Props = {
  title: string
  subtitle: string
  onDone: () => void
  duration?: number
}

export default function SuccessOverlay({ title, subtitle, onDone, duration = 2200 }: Props) {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 50)
    const t2 = setTimeout(() => setPhase('exit'), duration - 400)
    const t3 = setTimeout(onDone, duration)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const visible = phase === 'show'

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center max-w-[430px] mx-auto"
      style={{
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(10px)',
        opacity: phase === 'exit' ? 0 : 1,
        transition: 'opacity 0.35s ease',
      }}>

      {/* Ripple rings */}
      <div className="relative flex items-center justify-center mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="absolute rounded-full"
            style={{
              width: 56 + i * 40,
              height: 56 + i * 40,
              background: '#22C55E',
              opacity: visible ? 0 : 0.18 / i,
              transform: visible ? `scale(${1 + i * 0.35})` : 'scale(1)',
              transition: `transform ${0.6 + i * 0.15}s cubic-bezier(0.22,1,0.36,1) ${i * 80}ms, opacity ${0.6 + i * 0.15}s ease ${i * 80}ms`,
            }} />
        ))}

        {/* Circle */}
        <div style={{
          width: 88,
          height: 88,
          borderRadius: '50%',
          background: '#22C55E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: visible ? 'scale(1)' : 'scale(0.4)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.55s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease',
          boxShadow: '0 0 0 0 #22C55E40',
        }}>
          {/* Animated checkmark via SVG stroke-dashoffset */}
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <path
              d="M8 22L18 32L36 14"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="40"
              strokeDashoffset={visible ? 0 : 40}
              style={{ transition: 'stroke-dashoffset 0.45s cubic-bezier(0.22,1,0.36,1) 0.2s' }}
            />
          </svg>
        </div>
      </div>

      {/* Text */}
      <div style={{
        textAlign: 'center',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.4s ease 0.25s, transform 0.4s ease 0.25s',
      }}>
        <p style={{ color: 'white', fontSize: 22, fontWeight: 900, marginBottom: 8, fontFamily: 'var(--font-ui)' }}>
          {title}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontFamily: 'var(--font-ui)' }}>
          {subtitle}
        </p>
      </div>
    </div>
  )
}
