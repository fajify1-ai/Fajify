import { useState, useEffect, useRef } from 'react'
import type { NavigateFn } from '../App'
import { useDarkMode } from '../store/darkMode'

type Props = {
  navigate: NavigateFn
  orderTotal: string
  venueName: string
  venueImage: string
  items: { name: string; qty: number; price: number }[]
}

const RED = '#FA3F38'
const GREEN = '#22C55E'

const STEPS = [
  { key: 'placed',    label: 'Order Placed',    sub: 'We received your order',          icon: '📋' },
  { key: 'confirmed', label: 'Confirmed',        sub: 'Restaurant confirmed your order', icon: '✅' },
  { key: 'preparing', label: 'Preparing',        sub: 'Your food is being prepared',     icon: '👨‍🍳' },
  { key: 'pickup',    label: 'Rider Assigned',   sub: 'A rider is on their way to pick up', icon: '🛵' },
  { key: 'transit',   label: 'On the Way',       sub: 'Your order is heading to you',   icon: '📍' },
  { key: 'delivered', label: 'Delivered!',       sub: 'Enjoy your meal 🎉',             icon: '🎉' },
]

// Waypoints the rider animates through
const RIDER_PATH: [number, number][] = [
  [300, 130], [260, 130], [260, 90], [210, 90],
  [210, 50], [160, 50], [110, 50], [110, 90],
  [60, 90], [60, 130], [30, 130],
]

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

function LiveMap({ dark, riderT, arrived }: { dark: boolean; riderT: number; arrived: boolean }) {
  const bg    = dark ? '#1A2030' : '#E4EEF0'
  const block = dark ? '#141820' : '#DDEAE0'
  const park  = dark ? '#142014' : '#C8DCB8'
  const road  = dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)'
  const roadFill = dark ? '#1E2535' : '#F8FBFC'

  const totalSegs = RIDER_PATH.length - 1
  const segT = riderT * totalSegs
  const segIdx = Math.min(Math.floor(segT), totalSegs - 1)
  const localT = segT - segIdx
  const rx = lerp(RIDER_PATH[segIdx][0], RIDER_PATH[segIdx + 1][0], localT)
  const ry = lerp(RIDER_PATH[segIdx][1], RIDER_PATH[segIdx + 1][1], localT)

  const pathD = RIDER_PATH.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ')

  return (
    <svg width="100%" viewBox="0 0 330 180" style={{ display: 'block' }}>
      <rect width="330" height="180" fill={bg} />
      {/* Horizontal roads */}
      {[50, 90, 130].map(y => (
        <g key={y}>
          <rect x="0" y={y - 5} width="330" height="10" fill={road} />
          <rect x="0" y={y - 4} width="330" height="8" fill={roadFill} />
        </g>
      ))}
      {/* Vertical roads */}
      {[60, 110, 160, 210, 260].map(x => (
        <g key={x}>
          <rect x={x - 5} y="0" width="10" height="180" fill={road} />
          <rect x={x - 4} y="0" width="8" height="180" fill={roadFill} />
        </g>
      ))}
      {/* City blocks */}
      {[
        [0,0,55,45],[65,0,40,45],[115,0,40,45],[165,0,40,45],[215,0,40,45],[265,0,65,45],
        [0,55,55,30],[65,55,40,30],[115,55,40,30],[165,55,40,30],[215,55,40,30],[265,55,65,30],
        [0,95,55,30],[65,95,40,30],[115,95,40,30],[165,95,40,30],[215,95,40,30],[265,95,65,30],
        [0,135,55,45],[65,135,40,45],[115,135,40,45],[165,135,40,45],[215,135,40,45],[265,135,65,45],
      ].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h}
          fill={i % 5 === 2 ? park : block} rx="3" />
      ))}
      {/* Route dashes */}
      <path d={pathD} fill="none" stroke={RED} strokeWidth="2.5" strokeDasharray="7 4" opacity="0.7" />
      {/* Destination pin (restaurant) */}
      <circle cx={RIDER_PATH[0][0]} cy={RIDER_PATH[0][1]} r="11" fill={RED} />
      <text x={RIDER_PATH[0][0]} y={RIDER_PATH[0][1]} textAnchor="middle" dominantBaseline="middle" fontSize="11">🍽️</text>
      {/* You (home pin) */}
      <circle cx={RIDER_PATH[RIDER_PATH.length - 1][0]} cy={RIDER_PATH[RIDER_PATH.length - 1][1]} r="11" fill="#3B82F6" />
      <text x={RIDER_PATH[RIDER_PATH.length - 1][0]} y={RIDER_PATH[RIDER_PATH.length - 1][1]} textAnchor="middle" dominantBaseline="middle" fontSize="11">🏠</text>
      {/* Rider */}
      {!arrived && (
        <>
          <circle cx={rx} cy={ry} r="16" fill={RED} opacity="0.18" />
          <circle cx={rx} cy={ry} r="11" fill={RED} />
          <text x={rx} y={ry} textAnchor="middle" dominantBaseline="middle" fontSize="12">🛵</text>
        </>
      )}
      {arrived && (
        <circle cx={RIDER_PATH[RIDER_PATH.length - 1][0]} cy={RIDER_PATH[RIDER_PATH.length - 1][1]} r="16" fill={GREEN} opacity="0.35" />
      )}
      {/* ETA badge */}
      {!arrived && (
        <>
          <rect x="200" y="8" width="90" height="22" rx="11" fill={RED} />
          <text x="245" y="19" textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="bold" fill="white">
            ETA ~{Math.max(1, Math.round((1 - riderT) * 25))} min
          </text>
        </>
      )}
    </svg>
  )
}

export default function OrderTrackingScreen({ navigate, orderTotal, venueName, venueImage, items }: Props) {
  const { dark } = useDarkMode()
  const [step, setStep] = useState(0)
  const [riderT, setRiderT] = useState(0)
  const riderRef = useRef(0)

  const bg      = dark ? '#0F0F0F' : '#F5F5F5'
  const surface = dark ? '#1C1C1C' : '#FFFFFF'
  const ink     = dark ? '#F0F0F0' : '#1A1A1A'
  const muted   = dark ? '#888' : '#777'
  const border  = dark ? '#2A2A2A' : '#EBEBEB'

  const isDelivered = step >= STEPS.length - 1

  // Auto-advance steps: 0→1 after 2s, 1→2 after 4s, 2→3 after 6s, 3→4 after 4s, 4→5 after 8s
  useEffect(() => {
    const delays = [2000, 4000, 6000, 4000, 8000]
    let timeouts: ReturnType<typeof setTimeout>[] = []
    let acc = 0
    delays.forEach((d, i) => {
      acc += d
      const t = setTimeout(() => setStep(i + 1), acc)
      timeouts.push(t)
    })
    return () => timeouts.forEach(clearTimeout)
  }, [])

  // Animate rider from step 3 onward
  useEffect(() => {
    if (step < 3) return
    const id = setInterval(() => {
      riderRef.current = Math.min(riderRef.current + 0.006, 1)
      setRiderT(riderRef.current)
    }, 100)
    return () => clearInterval(id)
  }, [step])

  const showMap = step >= 3

  return (
    <div className="min-h-screen max-w-[430px] mx-auto" style={{ background: bg, fontFamily: 'var(--font-ui)' }}>
      <p role="note" className="px-5 py-2 text-center text-xs">Demo order · Local simulation only</p>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-5 pt-12 pb-4" style={{ background: surface, borderBottom: `1px solid ${border}` }}>
        <button aria-label="Back to discovery" onClick={() => navigate({ name: 'home' })}
          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: bg, border: `1px solid ${border}` }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[17px] font-black truncate" style={{ color: ink }}>
            {isDelivered ? 'Order Delivered!' : 'Tracking Your Order'}
          </h1>
          <p className="text-[11px]" style={{ color: muted }}>{venueName}</p>
        </div>
        {isDelivered && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[18px]"
            style={{ background: '#f0fdf4' }}>✓</div>
        )}
      </div>

      <div className="px-4 pt-4 pb-28 space-y-3">

        {/* Delivered banner */}
        {isDelivered && (
          <div className="rounded-3xl p-5 text-center" style={{ background: '#f0fdf4', border: '1.5px solid #86efac' }}>
            <p className="text-[40px] mb-1">🎉</p>
            <p className="text-[17px] font-black text-green-700">Your food has arrived!</p>
            <p className="text-[12px] text-green-600 mt-1">Enjoy your meal from {venueName}</p>
          </div>
        )}

        {/* Live map */}
        {showMap && !isDelivered && (
          <div className="rounded-3xl overflow-hidden" style={{ background: surface, border: `1px solid ${border}` }}>
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div>
                <p className="text-[14px] font-bold" style={{ color: ink }}>Live Tracking</p>
                <p className="text-[11px]" style={{ color: muted }}>Rider is on the way to you</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: RED }} />
                <span className="text-[11px] font-bold" style={{ color: RED }}>Live</span>
              </div>
            </div>
            <LiveMap dark={dark} riderT={riderT} arrived={isDelivered} />
            {/* Rider info */}
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderTop: `1px solid ${border}` }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-[20px] shrink-0"
                style={{ background: dark ? '#2A2A2A' : '#F5F5F5' }}>🛵</div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold" style={{ color: ink }}>Emeka Okafor</p>
                <p className="text-[11px]" style={{ color: muted }}>Honda Dispatch · LND-482-KA</p>
              </div>
              <button className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: RED }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.3 5.86 19.79 19.79 0 011.21 2.18 2 2 0 013.22 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.91 7.91a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
              </button>
            </div>
          </div>
        )}

        {/* Progress steps */}
        <div className="rounded-3xl p-4" style={{ background: surface, border: `1px solid ${border}` }}>
          <p className="text-[13px] font-bold mb-4" style={{ color: ink }}>Order Progress</p>
          {STEPS.map((s, i) => {
            const done = i <= step
            const active = i === step
            const isLast = i === STEPS.length - 1
            return (
              <div key={s.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[17px] shrink-0 transition-all duration-500"
                    style={{
                      background: done ? (active && !isLast ? RED : GREEN) : (dark ? '#252525' : '#F0F0F0'),
                      boxShadow: active && !isLast ? `0 0 0 4px ${RED}30` : 'none',
                    }}>
                    {done
                      ? (active && !isLast ? s.icon : '✓')
                      : <span style={{ color: muted, fontSize: 11 }}>·</span>}
                  </div>
                  {!isLast && (
                    <div className="w-0.5 flex-1 min-h-[18px] transition-all duration-700"
                      style={{ background: i < step ? GREEN : (dark ? '#2A2A2A' : '#E8E8E8') }} />
                  )}
                </div>
                <div className="pb-4 flex-1 min-w-0">
                  <p className="text-[13px] font-bold leading-tight transition-colors duration-500"
                    style={{ color: done ? ink : muted }}>{s.label}</p>
                  {(active || (isLast && done)) && (
                    <p className="text-[11px] mt-0.5" style={{ color: muted }}>{s.sub}</p>
                  )}
                </div>
                {active && !isDelivered && (
                  <div className="shrink-0 flex items-start pt-2.5">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: RED }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Order summary */}
        <div className="rounded-3xl p-4" style={{ background: surface, border: `1px solid ${border}` }}>
          <div className="flex items-center gap-3 mb-3">
            <img src={venueImage} alt={venueName}
              className="w-12 h-12 rounded-xl object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold truncate" style={{ color: ink }}>{venueName}</p>
              <p className="text-[11px]" style={{ color: muted }}>{items.length} item{items.length !== 1 ? 's' : ''}</p>
            </div>
            <p className="text-[15px] font-black shrink-0" style={{ color: RED }}>{orderTotal}</p>
          </div>
          <div className="space-y-1 pt-3" style={{ borderTop: `1px solid ${border}` }}>
            {items.map((item, i) => (
              <div key={i} className="flex justify-between items-center">
                <p className="text-[12px]" style={{ color: muted }}>
                  {item.qty > 1 && <span className="font-bold mr-1" style={{ color: ink }}>{item.qty}×</span>}
                  {item.name}
                </p>
                <p className="text-[12px] font-semibold" style={{ color: ink }}>
                  ₦{(item.price * item.qty).toLocaleString('en-NG')}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex gap-3">
          <button aria-label="Back to discovery" onClick={() => navigate({ name: 'home' })}
            className="flex-1 py-4 rounded-2xl text-[14px] font-bold"
            style={{ background: surface, color: ink, border: `1px solid ${border}` }}>
            Back to Home
          </button>
          <button onClick={() => navigate({ name: 'myTickets' })}
            className="flex-1 py-4 rounded-2xl text-[14px] font-bold text-white"
            style={{ background: RED }}>
            My Orders
          </button>
        </div>
      </div>
    </div>
  )
}
