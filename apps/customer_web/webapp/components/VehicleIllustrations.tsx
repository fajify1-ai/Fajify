import React from 'react'

export type VehicleType = 'economy' | 'comfort' | 'premium' | 'premium-van'

interface VehicleProps {
  className?: string
  width?: number | string
  height?: number | string
}

// Clay-white rim matching the inspiration renders
function ClayWheel({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const ri = r * 0.60
  const spokes = [0, 51.4, 102.9, 154.3, 205.7, 257.1, 308.6]
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#2A2A2A" />
      <circle cx={cx} cy={cy} r={ri} fill="#D8D8D8" />
      {spokes.map(a => {
        const rad = (a * Math.PI) / 180
        return (
          <line key={a}
            x1={cx + ri * 0.2 * Math.cos(rad)} y1={cy + ri * 0.2 * Math.sin(rad)}
            x2={cx + ri * 0.88 * Math.cos(rad)} y2={cy + ri * 0.88 * Math.sin(rad)}
            stroke="#ADADAD" strokeWidth="2" strokeLinecap="round" />
        )
      })}
      <circle cx={cx} cy={cy} r={ri * 0.2} fill="#555" />
      <circle cx={cx} cy={cy} r={ri * 0.09} fill="#888" />
      <ellipse cx={cx - ri * 0.22} cy={cy - ri * 0.26}
        rx={ri * 0.26} ry={ri * 0.13} fill="white" opacity="0.22"
        transform={`rotate(-30 ${cx - ri * 0.22} ${cy - ri * 0.26})`} />
    </g>
  )
}

// ─── Economy — compact 3-box sedan (Toyota Vios/Corolla style) ────────────────
export function EconomyVehicle({ className, width = '100%', height = '100%' }: VehicleProps) {
  const id = React.useId().replace(/:/g, 'e')
  return (
    <svg viewBox="0 0 300 168" fill="none" xmlns="http://www.w3.org/2000/svg"
      className={className} width={width} height={height}>
      <defs>
        <linearGradient id={`b-${id}`} x1="150" y1="52" x2="150" y2="144" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F4F4F4" />
          <stop offset="48%" stopColor="#DCDCDC" />
          <stop offset="100%" stopColor="#C2C2C2" />
        </linearGradient>
        <linearGradient id={`f-${id}`} x1="250" y1="95" x2="292" y2="118" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E2E2E2" />
          <stop offset="100%" stopColor="#C4C4C4" />
        </linearGradient>
        <linearGradient id={`r-${id}`} x1="148" y1="46" x2="148" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FAFAFA" />
          <stop offset="100%" stopColor="#EAEAEA" />
        </linearGradient>
        <linearGradient id={`h-${id}`} x1="40" y1="90" x2="40" y2="130" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E0E0E0" />
          <stop offset="100%" stopColor="#C8C8C8" />
        </linearGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="150" cy="159" rx="122" ry="7" fill="rgba(0,0,0,0.13)" />

      {/* Rear bumper / boot area */}
      <path d="M 35,132 Q 28,120 30,104 L 34,88 L 56,88 L 56,132 Z"
        fill={`url(#h-${id})`} />

      {/* Main body side */}
      <path d="
        M 56,132
        L 56,88
        L 76,64 L 96,52
        L 202,49 L 222,62
        L 245,90 Q 256,106 260,120 L 264,132
        L 228,132 A 23 23 0 0 0 184,132
        L 100,132 A 23 23 0 0 0 56,132 Z
      " fill={`url(#b-${id})`} />

      {/* Roof top panel */}
      <path d="M 96,52 L 102,44 L 210,41 L 218,49 L 202,49 Z"
        fill={`url(#r-${id})`} />

      {/* Front face */}
      <path d="M 245,90 Q 256,106 260,120 L 264,132 L 288,140 L 285,102 L 267,88 Z"
        fill={`url(#f-${id})`} />

      {/* Rear window */}
      <path d="M 76,64 L 96,52 L 150,49 L 150,86 L 72,88 Z"
        fill="rgba(115,130,145,0.25)" />
      <path d="M 76,64 L 96,52 L 150,49 L 150,86 L 72,88 Z"
        stroke="rgba(180,188,196,0.5)" strokeWidth="0.6" fill="none" />

      {/* Front window */}
      <path d="M 152,49 L 202,49 L 222,62 L 242,88 L 152,86 Z"
        fill="rgba(115,130,145,0.25)" />
      <path d="M 152,49 L 202,49 L 222,62 L 242,88 L 152,86 Z"
        stroke="rgba(180,188,196,0.5)" strokeWidth="0.6" fill="none" />

      {/* Windshield on front face */}
      <path d="M 222,62 L 248,74 L 272,98 L 258,110 L 242,88 Z"
        fill="rgba(108,128,146,0.30)" />

      {/* B-pillar */}
      <rect x="150" y="49" width="3" height="37" rx="1" fill="rgba(100,115,128,0.32)" />

      {/* Character line */}
      <path d="M 38,107 L 56,105 L 100,103 L 194,103 L 240,108 L 260,114"
        stroke="#C4C4C4" strokeWidth="1.1" fill="none" />

      {/* Door seam */}
      <path d="M 151,86 L 151,132" stroke="#C8C8C8" strokeWidth="0.8" opacity="0.5" />

      {/* Tail lights */}
      <rect x="28" y="96" width="7" height="24" rx="2.5" fill="#D49090" opacity="0.7" />
      <rect x="28" y="96" width="7" height="12" rx="2" fill="#CC3030" opacity="0.9" />
      <rect x="28" y="120" width="7" height="8" rx="1.5" fill="#E8C0B0" opacity="0.6" />

      {/* Headlights */}
      <path d="M 267,88 L 285,97 L 284,106 L 267,97 Z"
        fill="rgba(245,245,228,0.95)" />
      <rect x="272" y="108" width="13" height="4" rx="1.5" fill="rgba(220,205,155,0.65)" />

      {/* Front grille */}
      <path d="M 278,124 Q 280,121 285,122 L 287,138 L 278,136 Z"
        fill="rgba(25,25,25,0.72)" />
      {[0,1,2].map(i => (
        <line key={i} x1="279" y1={125 + i * 3.5} x2="286" y2={126 + i * 3.5}
          stroke="rgba(80,80,80,0.5)" strokeWidth="0.6" />
      ))}

      {/* Roof shine */}
      <path d="M 96,52 Q 152,49 202,49" stroke="white" strokeWidth="1.4" fill="none" opacity="0.55" />
      <path d="M 56,88 Q 154,84 244,90" stroke="white" strokeWidth="0.8" fill="none" opacity="0.15" />

      <ClayWheel cx={80} cy={132} r={20} />
      <ClayWheel cx={208} cy={132} r={20} />
    </svg>
  )
}

// ─── Comfort — mid-size SUV/crossover (Mazda CX-5 style) ─────────────────────
export function ComfortVehicle({ className, width = '100%', height = '100%' }: VehicleProps) {
  const id = React.useId().replace(/:/g, 'c')
  return (
    <svg viewBox="0 0 300 168" fill="none" xmlns="http://www.w3.org/2000/svg"
      className={className} width={width} height={height}>
      <defs>
        <linearGradient id={`b-${id}`} x1="150" y1="42" x2="150" y2="148" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F6F6F6" />
          <stop offset="45%" stopColor="#E0E0E0" />
          <stop offset="100%" stopColor="#C6C6C6" />
        </linearGradient>
        <linearGradient id={`f-${id}`} x1="252" y1="88" x2="294" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E4E4E4" />
          <stop offset="100%" stopColor="#C2C2C2" />
        </linearGradient>
        <linearGradient id={`r-${id}`} x1="150" y1="36" x2="150" y2="55" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FCFCFC" />
          <stop offset="100%" stopColor="#EAEAEA" />
        </linearGradient>
        <linearGradient id={`rear-${id}`} x1="38" y1="80" x2="38" y2="138" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#DEDEDE" />
          <stop offset="100%" stopColor="#C4C4C4" />
        </linearGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="152" cy="160" rx="124" ry="7.5" fill="rgba(0,0,0,0.13)" />

      {/* Rear face / tailgate */}
      <path d="M 30,138 Q 26,126 28,106 L 30,78 L 56,78 L 56,138 Z"
        fill={`url(#rear-${id})`} />

      {/* Main body — taller, more upright SUV shape */}
      <path d="
        M 56,138
        L 56,78
        L 66,58 L 86,44
        L 208,42 L 226,54
        L 248,84 Q 260,100 264,118 L 268,138
        L 232,138 A 24 24 0 0 0 184,138
        L 96,138 A 24 24 0 0 0 48,138 Z
      " fill={`url(#b-${id})`} />

      {/* Roof panel — wider, flatter SUV roof */}
      <path d="M 86,44 L 90,34 L 216,32 L 222,42 L 208,42 Z"
        fill={`url(#r-${id})`} />

      {/* Front face — more vertical, SUV-style */}
      <path d="M 248,84 Q 260,100 264,118 L 268,138 L 292,146 L 289,100 L 270,82 Z"
        fill={`url(#f-${id})`} />

      {/* Rear side window (smaller, more upright) */}
      <path d="M 66,58 L 86,44 L 148,42 L 148,80 L 68,80 Z"
        fill="rgba(110,128,144,0.26)" />
      <path d="M 66,58 L 86,44 L 148,42 L 148,80 L 68,80 Z"
        stroke="rgba(175,185,195,0.5)" strokeWidth="0.6" fill="none" />

      {/* Front door window */}
      <path d="M 150,42 L 208,42 L 226,54 L 246,82 L 150,80 Z"
        fill="rgba(110,128,144,0.26)" />
      <path d="M 150,42 L 208,42 L 226,54 L 246,82 L 150,80 Z"
        stroke="rgba(175,185,195,0.5)" strokeWidth="0.6" fill="none" />

      {/* Windshield — more upright angle */}
      <path d="M 226,54 L 252,66 L 276,96 L 262,110 L 246,82 Z"
        fill="rgba(108,128,146,0.28)" />

      {/* B-pillar */}
      <rect x="148" y="42" width="3.5" height="38" rx="1" fill="rgba(96,112,126,0.35)" />

      {/* Rear quarter window */}
      <path d="M 36,80 L 56,80 L 56,116 L 36,116 Z"
        fill="rgba(110,128,144,0.18)" stroke="rgba(175,185,195,0.4)" strokeWidth="0.5" />

      {/* D-pillar */}
      <rect x="56" y="78" width="3" height="42" rx="1" fill="rgba(96,112,126,0.3)" />

      {/* Body cladding / sill — SUV feature */}
      <path d="M 56,130 L 96,128 L 184,128 L 232,130 L 268,132"
        stroke="#B8B8B8" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 56,130 L 96,128 L 184,128 L 232,130 L 268,132"
        stroke="rgba(100,100,100,0.2)" strokeWidth="5" fill="none" strokeLinecap="round" />

      {/* Character line */}
      <path d="M 34,104 L 56,102 L 96,100 L 192,100 L 244,106 L 264,112"
        stroke="#C4C4C4" strokeWidth="1.1" fill="none" />

      {/* Door seam */}
      <path d="M 150,80 L 150,138" stroke="#C8C8C8" strokeWidth="0.9" opacity="0.5" />

      {/* Tail lights — wider SUV style */}
      <rect x="26" y="84" width="7" height="34" rx="2.5" fill="#D49090" opacity="0.65" />
      <rect x="26" y="84" width="7" height="16" rx="2" fill="#CC3030" opacity="0.9" />

      {/* Headlights — SUV angular style */}
      <path d="M 270,82 L 289,92 L 288,102 L 270,93 Z"
        fill="rgba(245,245,228,0.95)" />
      <rect x="275" y="104" width="14" height="5" rx="2" fill="rgba(220,205,155,0.65)" />

      {/* Front grille — wider, more aggressive SUV grille */}
      <path d="M 280,120 L 292,124 L 291,140 L 280,137 Z"
        fill="rgba(20,20,20,0.75)" />
      {[0,1,2,3].map(i => (
        <line key={i} x1="281" y1={122 + i * 4} x2="291" y2={124 + i * 4}
          stroke="rgba(80,80,80,0.5)" strokeWidth="0.7" />
      ))}

      {/* Front skid plate — SUV feature */}
      <path d="M 270,136 L 292,142 L 291,148 L 270,142 Z"
        fill="rgba(160,160,160,0.5)" />

      {/* Roof shine */}
      <path d="M 86,44 Q 150,42 208,42" stroke="white" strokeWidth="1.6" fill="none" opacity="0.6" />
      <path d="M 56,78 Q 150,74 248,84" stroke="white" strokeWidth="0.8" fill="none" opacity="0.18" />

      <ClayWheel cx={72} cy={138} r={22} />
      <ClayWheel cx={210} cy={138} r={22} />
    </svg>
  )
}

// ─── Premium — low luxury coupe (Mercedes CLA/S-Class style) ─────────────────
export function PremiumVehicle({ className, width = '100%', height = '100%' }: VehicleProps) {
  const id = React.useId().replace(/:/g, 'p')
  return (
    <svg viewBox="0 0 300 168" fill="none" xmlns="http://www.w3.org/2000/svg"
      className={className} width={width} height={height}>
      <defs>
        <linearGradient id={`b-${id}`} x1="150" y1="60" x2="150" y2="148" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F2F2F2" />
          <stop offset="45%" stopColor="#DCDCDC" />
          <stop offset="100%" stopColor="#C0C0C0" />
        </linearGradient>
        <linearGradient id={`f-${id}`} x1="256" y1="100" x2="295" y2="122" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#DEDEDE" />
          <stop offset="100%" stopColor="#BEBEBE" />
        </linearGradient>
        <linearGradient id={`r-${id}`} x1="152" y1="52" x2="152" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F8F8F8" />
          <stop offset="100%" stopColor="#EBEBEB" />
        </linearGradient>
        <linearGradient id={`boot-${id}`} x1="36" y1="94" x2="36" y2="138" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E2E2E2" />
          <stop offset="100%" stopColor="#C6C6C6" />
        </linearGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="152" cy="160" rx="126" ry="6.5" fill="rgba(0,0,0,0.14)" />

      {/* Boot / rear — Mercedes CLA has a prominent boot lip */}
      <path d="M 26,136 Q 22,124 24,108 L 28,94 L 54,94 L 56,136 Z"
        fill={`url(#boot-${id})`} />

      {/* Main body — very low, long, sleek coupe */}
      <path d="
        M 56,136
        L 54,94
        L 68,76 L 88,63
        L 104,56 L 210,54
        L 228,64 L 252,98
        Q 262,112 266,124 L 270,136
        L 234,136 A 23 23 0 0 0 188,136
        L 98,136 A 23 23 0 0 0 52,136 Z
      " fill={`url(#b-${id})`} />

      {/* Roof top — very low fastback arch (CLA style) */}
      <path d="M 104,56 L 108,48 L 218,46 L 228,54 L 210,54 Z"
        fill={`url(#r-${id})`} />

      {/* Front face */}
      <path d="M 252,98 Q 262,112 266,124 L 270,136 L 293,144 L 290,106 L 272,94 Z"
        fill={`url(#f-${id})`} />

      {/* Rear quarter window — smaller on coupe */}
      <path d="M 68,76 L 88,63 L 106,56 L 150,54 L 150,88 L 74,90 Z"
        fill="rgba(112,128,144,0.25)" />
      <path d="M 68,76 L 88,63 L 106,56 L 150,54 L 150,88 L 74,90 Z"
        stroke="rgba(175,185,195,0.5)" strokeWidth="0.6" fill="none" />

      {/* Front door window — longer on coupe */}
      <path d="M 152,54 L 210,54 L 228,64 L 250,96 L 152,88 Z"
        fill="rgba(112,128,144,0.25)" />
      <path d="M 152,54 L 210,54 L 228,64 L 250,96 L 152,88 Z"
        stroke="rgba(175,185,195,0.5)" strokeWidth="0.6" fill="none" />

      {/* Windshield — more raked on coupe */}
      <path d="M 228,64 L 256,76 L 278,104 L 264,116 L 250,96 Z"
        fill="rgba(108,128,146,0.28)" />

      {/* B-pillar */}
      <rect x="150" y="54" width="3" height="34" rx="1" fill="rgba(96,112,126,0.32)" />

      {/* Pronounced character line — Mercedes style */}
      <path d="M 30,110 L 54,107 L 100,104 L 200,104 L 248,110 L 266,116"
        stroke="#C2C2C2" strokeWidth="1.3" fill="none" />
      {/* Lower body crease */}
      <path d="M 26,122 L 54,120 L 100,118 L 200,118 L 250,122 L 268,127"
        stroke="rgba(200,200,200,0.55)" strokeWidth="0.7" fill="none" />

      {/* Boot lid lip — CLA feature */}
      <path d="M 28,94 L 54,94 L 54,98 L 28,98 Z"
        fill="rgba(160,160,160,0.6)" />

      {/* Tail lights — sleek horizontal strip */}
      <rect x="22" y="100" width="8" height="28" rx="2.5" fill="#D8A0A0" opacity="0.6" />
      <rect x="22" y="100" width="8" height="14" rx="2" fill="#CC2828" opacity="0.92" />
      {/* LED line detail */}
      <rect x="23" y="115" width="6" height="1.5" rx="0.8" fill="rgba(220,160,150,0.8)" />

      {/* Headlights — sleek Mercedes angular */}
      <path d="M 272,94 L 290,104 L 289,112 L 272,104 Z"
        fill="rgba(248,248,228,0.97)" />
      {/* DRL strip */}
      <path d="M 272,94 L 290,104" stroke="rgba(240,240,210,0.8)" strokeWidth="1.8" />
      <rect x="276" y="114" width="14" height="3.5" rx="1.5" fill="rgba(220,205,155,0.6)" />

      {/* Grille — Mercedes diamond pattern */}
      <path d="M 280,126 L 292,130 L 291,140 L 279,137 Z"
        fill="rgba(22,22,22,0.78)" />
      {/* Star logo hint */}
      <circle cx="286" cy="117" r="4" fill="none" stroke="rgba(200,200,200,0.5)" strokeWidth="0.8" />
      <path d="M 286,113 L 286,121 M 282.5,119 L 289.5,115"
        stroke="rgba(200,200,200,0.5)" strokeWidth="0.8" />

      {/* Door seam */}
      <path d="M 151,88 L 151,136" stroke="#C8C8C8" strokeWidth="0.8" opacity="0.45" />

      {/* Roof shine */}
      <path d="M 104,56 Q 156,54 210,54" stroke="white" strokeWidth="1.5" fill="none" opacity="0.55" />
      <path d="M 54,94 Q 154,88 254,98" stroke="white" strokeWidth="0.8" fill="none" opacity="0.14" />

      <ClayWheel cx={74} cy={136} r={21} />
      <ClayWheel cx={212} cy={136} r={21} />
    </svg>
  )
}

// ─── Premium Van — Mercedes Vito panel van ────────────────────────────────────
export function PremiumVanVehicle({ className, width = '100%', height = '100%' }: VehicleProps) {
  const id = React.useId().replace(/:/g, 'v')
  return (
    <svg viewBox="0 0 300 168" fill="none" xmlns="http://www.w3.org/2000/svg"
      className={className} width={width} height={height}>
      <defs>
        <linearGradient id={`b-${id}`} x1="150" y1="28" x2="150" y2="148" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F4F4F4" />
          <stop offset="42%" stopColor="#DEDEDE" />
          <stop offset="100%" stopColor="#C2C2C2" />
        </linearGradient>
        <linearGradient id={`f-${id}`} x1="254" y1="82" x2="295" y2="122" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E4E4E4" />
          <stop offset="100%" stopColor="#C0C0C0" />
        </linearGradient>
        <linearGradient id={`r-${id}`} x1="150" y1="20" x2="150" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FAFAFA" />
          <stop offset="100%" stopColor="#EBEBEB" />
        </linearGradient>
        <linearGradient id={`rr-${id}`} x1="34" y1="38" x2="34" y2="142" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E0E0E0" />
          <stop offset="100%" stopColor="#C4C4C4" />
        </linearGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="152" cy="160" rx="126" ry="7.5" fill="rgba(0,0,0,0.13)" />

      {/* Rear panel (flat van back) */}
      <path d="M 24,140 Q 20,128 22,100 L 22,46 Q 24,34 36,30 L 58,30 L 58,140 Z"
        fill={`url(#rr-${id})`} />

      {/* Main body — tall, boxy van */}
      <path d="
        M 58,140
        L 58,30
        L 228,28 L 244,36
        L 252,60 L 256,88
        Q 262,108 266,126 L 270,140
        L 234,140 A 24 24 0 0 0 186,140
        L 92,140 A 24 24 0 0 0 44,140 Z
      " fill={`url(#b-${id})`} />

      {/* Roof panel */}
      <path d="M 58,30 L 60,20 L 240,18 L 248,28 L 228,28 Z"
        fill={`url(#r-${id})`} />

      {/* Front face — nearly vertical van face */}
      <path d="M 256,88 Q 262,108 266,126 L 270,140 L 294,148 L 291,100 L 274,80 Z"
        fill={`url(#f-${id})`} />

      {/* Rear quarter glass (small high window) */}
      <path d="M 24,38 L 58,38 L 58,74 L 24,74 Z"
        fill="rgba(108,124,140,0.22)" stroke="rgba(172,182,192,0.45)" strokeWidth="0.6" />

      {/* Cargo area panel windows */}
      <path d="M 60,30 L 120,30 L 120,88 L 60,88 Z"
        fill="rgba(108,124,140,0.15)" stroke="rgba(172,182,192,0.4)" strokeWidth="0.6" />
      <path d="M 122,30 L 182,30 L 182,88 L 122,88 Z"
        fill="rgba(108,124,140,0.15)" stroke="rgba(172,182,192,0.4)" strokeWidth="0.6" />

      {/* Front cabin window — larger */}
      <path d="M 184,28 L 228,28 L 244,36 L 252,60 L 256,88 L 184,88 Z"
        fill="rgba(108,124,140,0.26)" stroke="rgba(172,182,192,0.5)" strokeWidth="0.6" />

      {/* Windshield — near vertical van */}
      <path d="M 244,36 L 268,52 L 278,86 L 260,96 L 256,88 L 252,60 Z"
        fill="rgba(108,124,140,0.30)" />

      {/* Window pillar lines (Vito has prominent pillars) */}
      <rect x="120" y="28" width="3" height="62" fill="rgba(80,90,100,0.28)" />
      <rect x="182" y="28" width="3" height="62" fill="rgba(80,90,100,0.28)" />
      <rect x="58" y="30" width="2.5" height="60" fill="rgba(80,90,100,0.22)" />

      {/* Character / body line */}
      <path d="M 24,100 L 58,98 L 96,97 L 190,97 L 252,102 L 266,108"
        stroke="#C2C2C2" strokeWidth="1.2" fill="none" />

      {/* Rear door lines */}
      <path d="M 58,88 L 58,140" stroke="#C4C4C4" strokeWidth="1" opacity="0.5" />
      <path d="M 40,88 L 40,140" stroke="#C4C4C4" strokeWidth="0.6" opacity="0.35" />

      {/* Sliding door handle */}
      <rect x="130" y="102" width="18" height="3" rx="1.5" fill="rgba(100,100,100,0.25)" />

      {/* Tail lights — full-height van tail lights */}
      <rect x="20" y="46" width="6" height="52" rx="2.5" fill="#D49090" opacity="0.6" />
      <rect x="20" y="46" width="6" height="24" rx="2" fill="#CC3030" opacity="0.9" />
      <rect x="20" y="72" width="6" height="10" rx="1.5" fill="#E8B8A8" opacity="0.55" />

      {/* Headlights — Vito horizontal */}
      <path d="M 274,80 L 291,90 L 290,102 L 274,93 Z"
        fill="rgba(248,248,228,0.97)" />
      <rect x="278" y="104" width="13" height="5" rx="2" fill="rgba(220,205,155,0.65)" />

      {/* Mercedes Vito front grille — distinctive mesh */}
      <path d="M 278,118 L 292,122 L 291,142 L 278,139 Z"
        fill="rgba(18,18,18,0.78)" />
      {[0,1,2,3,4].map(i => (
        <line key={i} x1="279" y1={120 + i * 4.2} x2="291" y2={122 + i * 4.2}
          stroke="rgba(80,80,80,0.55)" strokeWidth="0.7" />
      ))}

      {/* Mercedes star on front face */}
      <circle cx="268" cy="110" r="5" fill="none" stroke="rgba(195,195,195,0.55)" strokeWidth="0.9" />
      <path d="M 268,105 L 268,115 M 263.7,112.5 L 272.3,107.5"
        stroke="rgba(195,195,195,0.55)" strokeWidth="0.9" />

      {/* Roof shine */}
      <path d="M 60,28 Q 148,26 228,28" stroke="white" strokeWidth="1.6" fill="none" opacity="0.6" />
      <path d="M 22,46 Q 152,38 258,88" stroke="white" strokeWidth="0.8" fill="none" opacity="0.12" />

      <ClayWheel cx={66} cy={140} r={22} />
      <ClayWheel cx={212} cy={140} r={22} />
    </svg>
  )
}

// ─── Default export ───────────────────────────────────────────────────────────
export default function VehicleIllustration({ type, ...props }: { type: VehicleType } & VehicleProps) {
  if (type === 'economy') return <EconomyVehicle {...props} />
  if (type === 'comfort') return <ComfortVehicle {...props} />
  if (type === 'premium') return <PremiumVehicle {...props} />
  return <PremiumVanVehicle {...props} />
}
