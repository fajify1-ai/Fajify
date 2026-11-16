import { useDialogFocus } from './useDialogFocus'
import { useState, useEffect } from 'react'

export interface ScanResult {
  valid: boolean
  type: 'booking' | 'ride' | 'delivery'
  name: string
  detail: string
  ref: string
}

const MOCK_SCANS: ScanResult[] = [
  { valid: true,  type: 'booking',  name: 'Amara & Chidi',   detail: 'Premium Package · 4 guests · 7:00 PM', ref: 'FJ-BOOK-V001-2408' },
  { valid: true,  type: 'booking',  name: 'Tobi Adeyemi',    detail: 'Starter Package · 2 guests · 8:00 PM', ref: 'FJ-BOOK-V002-2408' },
  { valid: true,  type: 'ride',     name: 'Grace Okafor',    detail: 'fajify Ride · Ikeja → VI · 6:00 PM',    ref: 'FJ-RIDE-T003-2408' },
  { valid: false, type: 'booking',  name: 'Unknown',         detail: 'Ticket not found or expired',         ref: 'INVALID' },
  { valid: true,  type: 'delivery', name: 'Emeka Eze',       detail: 'fajify Packages · Gift box · 14.7 km',  ref: 'FJ-DEL-D003-2408' },
]

interface Props {
  scans?: ScanResult[]
  checkedIn?: Record<string, boolean>
  onCheckIn?: (result: ScanResult) => void
  onClose: () => void
  accent: string
  dark: boolean
}

export default function QRScanner({ onClose, accent, dark, scans = MOCK_SCANS, checkedIn = {}, onCheckIn }: Props) {
  const dialogRef = useDialogFocus(true, onClose)
  const surface = dark ? '#1A1A1A' : '#FFFFFF'
  const ink     = dark ? '#F0F0F0' : '#1A1A1A'
  const muted   = dark ? '#777'    : '#888'
  const bg      = dark ? '#0A0A0A' : '#0A0A0A'

  const [phase, setPhase] = useState<'scanning' | 'result'>('scanning')
  const [scanY, setScanY]  = useState(0)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [scanIdx, setScanIdx] = useState(0)

  useEffect(() => {
    if (phase !== 'scanning') return
    const id = setInterval(() => setScanY(y => (y + 2) % 100), 16)
    return () => clearInterval(id)
  }, [phase])

  function handleTap() {
    if (phase === 'result') { setPhase('scanning'); setResult(null); return }
    const r = scans[scanIdx % scans.length]
    setScanIdx(i => i + 1)
    setResult(r)
    setPhase('result')
  }

  const typeColor: Record<string, string> = { booking: accent, ride: '#22C55E', delivery: '#F59E0B' }
  const typeLabel: Record<string, string> = { booking: 'Booking Ticket', ride: 'Ride Pass', delivery: 'Delivery Pass' }

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Simulated QR scanner" className="fixed inset-0 z-50 flex flex-col max-w-[430px] mx-auto" style={{ background: bg }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">fajify</p>
          <p className="text-[18px] font-black text-white">QR Scanner</p>
        </div>
        <button aria-label="Close QR scanner" onClick={onClose} className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5" fill="none">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Viewfinder */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6" onClick={event => { if (!(event.target as HTMLElement).closest('button')) handleTap() }}>

        {phase === 'scanning' ? (
          <>
            {/* Camera frame */}
            <div className="relative w-[220px] h-[220px]">
              {/* Corner brackets */}
              {[
                'top-0 left-0 border-t-4 border-l-4 rounded-tl-[16px]',
                'top-0 right-0 border-t-4 border-r-4 rounded-tr-[16px]',
                'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-[16px]',
                'bottom-0 right-0 border-b-4 border-r-4 rounded-br-[16px]',
              ].map((cls, i) => (
                <div key={i} className={`absolute w-10 h-10 ${cls}`} style={{ borderColor: accent }} />
              ))}

              {/* Scan line */}
              <div className="absolute left-2 right-2 h-[2px] rounded-full"
                style={{ top: `${scanY}%`, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, boxShadow: `0 0 8px ${accent}` }} />

              {/* Center grid hint */}
              <div className="absolute inset-4 rounded-lg opacity-10" style={{ border: '1px solid white' }} />

              {/* Mock QR placeholder */}
              <div className="absolute inset-8 rounded-lg opacity-20 grid grid-cols-5 grid-rows-5 gap-1 p-2">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div key={i} className="rounded-[2px]" style={{ background: (i * 7 % 11) > 4 ? 'white' : 'transparent' }} />
                ))}
              </div>
            </div>

            <div className="text-center">
              <p className="text-[15px] font-black text-white mb-1">Tap to simulate scan</p>
              <p className="text-[12px] text-white/50">Simulation only · No camera is accessed</p>
              <button onClick={handleTap} className="mt-4 rounded-full px-5 py-3 text-sm font-bold text-white" style={{background: accent}}>Simulate scan</button>
            </div>

            {/* Recent scans hint */}
            <div className="w-full rounded-[16px] px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <p className="text-[12px] text-white/40">Supports booking, ride & delivery QR codes</p>
            </div>
          </>
        ) : result ? (
          /* Result card */
          <div className="w-full">
            <div className="rounded-[24px] overflow-hidden" style={{ background: surface, boxShadow: `0 0 0 3px ${result.valid ? typeColor[result.type] : '#EF4444'}40` }}>

              {/* Status band */}
              <div className="px-5 py-4 flex items-center gap-3"
                style={{ background: result.valid ? (typeColor[result.type] + '18') : '#EF444418' }}>
                <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: result.valid ? typeColor[result.type] : '#EF4444' }}>
                  {result.valid
                    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  }
                </div>
                <div>
                  <p className="text-[13px] font-black" style={{ color: result.valid ? typeColor[result.type] : '#EF4444' }}>
                    {result.valid ? 'Verified ✓' : 'Invalid Ticket'}
                  </p>
                  <p className="text-[11px]" style={{ color: muted }}>
                    {result.valid ? typeLabel[result.type] : 'Ticket not recognised'}
                  </p>
                </div>
              </div>

              {/* Info */}
              {result.valid && (
                <div className="px-5 py-4 flex flex-col gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: muted }}>Guest</p>
                    <p className="text-[16px] font-black" style={{ color: ink }}>{result.name}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: muted }}>Details</p>
                    <p className="text-[13px] font-semibold" style={{ color: ink }}>{result.detail}</p>
                  </div>
                  <div className="rounded-[12px] px-3 py-2.5 flex items-center justify-between" style={{ background: dark ? '#141414' : '#F5F5F5' }}>
                    <p className="text-[11px] font-bold font-mono" style={{ color: muted }}>{result.ref}</p>
                    <span className="text-[10px] font-black px-2 py-1 rounded-full" style={{ background: typeColor[result.type] + '20', color: typeColor[result.type] }}>
                      {typeLabel[result.type]}
                    </span>
                  </div>
                </div>
              )}

              <div className="px-5 pb-5">
                {result.valid && result.type === 'booking' && onCheckIn && <button disabled={checkedIn[result.ref]} onClick={() => onCheckIn(result)} className="w-full rounded-xl py-3 mb-3 text-white" style={{background: accent}}>{checkedIn[result.ref] ? 'Guest checked in locally' : 'Confirm demo check-in'}</button>}
                <button aria-label="Scan next" onClick={handleTap} className="w-full rounded-[14px] py-3.5 text-[14px] font-black text-white"
                  style={{ background: result.valid ? typeColor[result.type] : '#EF4444' }}>
                  Scan Next
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Recent scans list */}
      {phase === 'scanning' && (
        <div className="px-5 pb-10">
          <p className="text-[12px] font-black text-white/30 uppercase tracking-wider mb-3">Recent Scans</p>
          <div className="flex flex-col gap-2">
            {scans.slice(0, 3).map((s, i) => (
              <div key={i} className="flex items-center gap-3 rounded-[12px] px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-2 w-2 rounded-full shrink-0" style={{ background: s.valid ? '#22C55E' : '#EF4444' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-white truncate">{s.name}</p>
                  <p className="text-[10px] text-white/40 truncate">{s.detail}</p>
                </div>
                <p className="text-[10px] text-white/30 shrink-0">{i === 0 ? '2m ago' : i === 1 ? '8m ago' : '22m ago'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
