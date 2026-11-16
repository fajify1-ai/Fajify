import type { CSSProperties, ReactElement } from 'react'

export type VehicleType = 'economy' | 'comfort' | 'premium' | 'van'

interface Props {
  type: VehicleType
  className?: string
  style?: CSSProperties
}

function Wheel({ cx, cy, r = 22, n = 5, rim = '#2A2A2A' }: {
  cx: number; cy: number; r?: number; n?: number; rim?: string
}): ReactElement {
  const spokes = Array.from({ length: n }, (_, i) => {
    const a = ((i / n) * 2 * Math.PI) - Math.PI / 2
    return { x: cx + (r - 6) * Math.cos(a), y: cy + (r - 6) * Math.sin(a) }
  })
  return (
    <>
      <circle cx={cx} cy={cy} r={r + 3} fill="#080808" />
      <circle cx={cx} cy={cy} r={r} fill="#181818" />
      <circle cx={cx} cy={cy} r={r - 3} fill={rim} />
      {spokes.map((s, i) => (
        <line key={i} x1={cx} y1={cy} x2={s.x} y2={s.y}
          stroke="#0E0E0E" strokeWidth="2.2" strokeLinecap="round" />
      ))}
      <circle cx={cx} cy={cy} r={5} fill="#505050" />
      <circle cx={cx} cy={cy} r={2.2} fill="#1A1A1A" />
      <circle cx={cx} cy={cy} r={r - 3} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
    </>
  )
}

/* ── Economy ── compact sedan · electric blue ─────────────────────────────── */
function Economy(): ReactElement {
  return (
    <svg viewBox="0 0 320 170" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ec-bd" x1="160" y1="34" x2="160" y2="136" gradientUnits="userSpaceOnUse">
          <stop stopColor="#699DFF" />
          <stop offset="0.55" stopColor="#3B6FE8" />
          <stop offset="1" stopColor="#2146BE" />
        </linearGradient>
        <linearGradient id="ec-gl" x1="152" y1="35" x2="192" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0D2256" />
          <stop offset="1" stopColor="#060E28" />
        </linearGradient>
      </defs>

      {/* ground shadow */}
      <ellipse cx="160" cy="157" rx="128" ry="9" fill="rgba(0,0,0,0.22)" />

      {/* main body */}
      <path d="M 56 108 Q 52 118 54 130 L 58 136 H 262 L 266 130
               Q 270 120 266 108 L 264 92 Q 262 82 256 78
               L 210 70 L 192 46 Q 174 34 152 34
               L 116 40 L 102 52 Q 94 58 88 66
               L 78 70 Q 68 72 62 82 L 56 96 Z"
            fill="url(#ec-bd)" />

      {/* rear face depth */}
      <path d="M 56 108 Q 52 118 54 130 L 58 136 L 70 136
               L 68 84 L 62 82 L 56 96 Z"
            fill="rgba(0,0,0,0.22)" />

      {/* roof specular */}
      <path d="M 192 46 Q 174 34 152 34 L 116 40 L 124 40
               Q 150 34 170 36 Q 186 38 190 46 Z"
            fill="rgba(255,255,255,0.14)" />

      {/* cabin glass */}
      <path d="M 197 68 L 188 46 Q 172 35 152 35
               L 114 41 L 100 53 Q 93 59 88 68 Z"
            fill="url(#ec-gl)" />

      {/* B-pillar */}
      <rect x="147" y="38" width="5" height="30" rx="1" fill="#122050" />

      {/* glass glare */}
      <path d="M 162 36 L 156 37 L 186 68 L 192 68 Z" fill="rgba(255,255,255,0.09)" />
      <path d="M 122 40 L 116 42 L 102 54 L 108 53 Z" fill="rgba(255,255,255,0.09)" />

      {/* window frame */}
      <path d="M 197 68 L 188 46 Q 172 35 152 35
               L 114 41 L 100 53 Q 93 59 88 68 Z"
            stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" fill="none" />

      <Wheel cx={88} cy={126} r={22} n={5} rim="#252525" />
      <Wheel cx={232} cy={126} r={22} n={5} rim="#252525" />

      {/* headlight */}
      <path d="M 265 95 L 268 99 L 266 108 L 264 93 Z" fill="#FFF3C0" fillOpacity="0.88" />
      <line x1="265" y1="93" x2="268" y2="100" stroke="#FFE090" strokeWidth="1.4" strokeLinecap="round" />

      {/* tail light */}
      <rect x="52" y="102" width="5" height="22" rx="1.5" fill="#CC1111" fillOpacity="0.82" />
      <rect x="52" y="103" width="2" height="8" rx="1" fill="#FF4444" />

      {/* door seam */}
      <line x1="148" y1="68" x2="146" y2="112" stroke="rgba(15,35,90,0.4)" strokeWidth="1.2" />

      {/* hood crease */}
      <path d="M 210 72 Q 233 75 256 80" stroke="rgba(255,255,255,0.11)" strokeWidth="1" fill="none" />

      {/* side mirror */}
      <path d="M 214 70 Q 220 67 224 70 L 223 76 L 213 76 Z" fill="#2840A8" />
    </svg>
  )
}

/* ── Comfort ── spacious sedan · deep graphite ────────────────────────────── */
function Comfort(): ReactElement {
  return (
    <svg viewBox="0 0 320 170" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="co-bd" x1="160" y1="32" x2="160" y2="138" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3C3C4E" />
          <stop offset="0.5" stopColor="#1C1C2A" />
          <stop offset="1" stopColor="#0A0A12" />
        </linearGradient>
        <linearGradient id="co-gl" x1="150" y1="32" x2="188" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="#131B34" />
          <stop offset="1" stopColor="#07090F" />
        </linearGradient>
      </defs>

      <ellipse cx="160" cy="157" rx="132" ry="9" fill="rgba(0,0,0,0.28)" />

      {/* body — longer wheelbase, slightly lower */}
      <path d="M 50 106 Q 46 116 48 130 L 52 136 H 268 L 272 130
               Q 276 118 272 106 L 270 88 Q 268 78 260 74
               L 214 68 L 198 44 Q 180 32 158 32
               L 116 38 L 98 52 Q 90 60 82 70
               L 72 74 Q 62 76 56 84 L 50 98 Z"
            fill="url(#co-bd)" />

      <path d="M 50 106 Q 46 116 48 130 L 52 136 L 66 136
               L 64 84 L 56 84 L 50 98 Z"
            fill="rgba(0,0,0,0.28)" />

      {/* roof specular */}
      <path d="M 198 44 Q 180 32 158 32 L 116 38 L 124 38
               Q 152 32 172 34 Q 190 37 196 44 Z"
            fill="rgba(255,255,255,0.10)" />

      {/* cabin glass */}
      <path d="M 202 66 L 194 44 Q 178 32 158 32
               L 116 38 L 98 52 Q 90 60 82 70 Z"
            fill="url(#co-gl)" />

      {/* B-pillar */}
      <rect x="150" y="36" width="5" height="32" rx="1" fill="#09090F" />

      <path d="M 168 34 L 160 34 L 192 66 L 198 66 Z" fill="rgba(255,255,255,0.07)" />
      <path d="M 124 38 L 116 40 L 100 54 L 108 52 Z" fill="rgba(255,255,255,0.07)" />

      {/* chrome window surround */}
      <path d="M 202 66 L 194 44 Q 178 32 158 32
               L 116 38 L 98 52 Q 90 60 82 70 Z"
            stroke="rgba(200,204,220,0.26)" strokeWidth="1" fill="none" />

      {/* belt line accent */}
      <path d="M 56 86 Q 102 82 142 70 H 212 L 262 76"
            stroke="rgba(180,182,200,0.18)" strokeWidth="1.2" fill="none" />

      <Wheel cx={82} cy={128} r={24} n={10} rim="#28283A" />
      <Wheel cx={238} cy={128} r={24} n={10} rim="#28283A" />

      {/* DRL headlight */}
      <rect x="271" y="90" width="3" height="18" rx="1.5" fill="white" fillOpacity="0.62" />
      <path d="M 270 90 L 275 95 L 273 108" stroke="#D0E0FF" strokeWidth="1.6" strokeLinecap="round" />

      {/* tail light */}
      <rect x="47" y="100" width="4" height="28" rx="1.5" fill="#AA0000" fillOpacity="0.88" />
      <rect x="47" y="100" width="2" height="10" rx="1" fill="#FF3333" />

      <line x1="150" y1="66" x2="148" y2="114" stroke="rgba(8,8,18,0.5)" strokeWidth="1.2" />

      <path d="M 214 70 Q 238 73 260 76" stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none" />

      {/* mirror */}
      <path d="M 220 68 Q 226 65 230 68 L 229 74 L 218 74 Z"
            fill="#141420" stroke="rgba(180,182,200,0.3)" strokeWidth="0.6" />
    </svg>
  )
}

/* ── Premium ── luxury fastback · midnight navy · gold trim ──────────────── */
function Premium(): ReactElement {
  return (
    <svg viewBox="0 0 320 170" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pr-bd" x1="160" y1="27" x2="160" y2="138" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E1E30" />
          <stop offset="0.45" stopColor="#0C0C1A" />
          <stop offset="1" stopColor="#030308" />
        </linearGradient>
        <linearGradient id="pr-gl" x1="150" y1="29" x2="192" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="#152038" />
          <stop offset="1" stopColor="#070C18" />
        </linearGradient>
        <linearGradient id="pr-go" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#A88040" />
          <stop offset="0.5" stopColor="#E8CA80" />
          <stop offset="1" stopColor="#A88040" />
        </linearGradient>
      </defs>

      <ellipse cx="160" cy="157" rx="134" ry="9" fill="rgba(0,0,0,0.35)" />

      {/* body — very long hood, fastback slope at rear */}
      <path d="M 46 106 Q 42 116 44 130 L 48 136 H 268 L 274 130
               Q 278 118 274 106 L 272 86 Q 270 76 262 72
               L 216 65 L 200 40 Q 182 27 160 27
               L 118 34 L 94 52 Q 84 62 76 74
               L 63 80 Q 54 84 50 92 L 46 106 Z"
            fill="url(#pr-bd)" />

      {/* rear face depth */}
      <path d="M 46 106 Q 42 116 44 130 L 48 136 L 64 136
               L 62 84 L 54 86 L 46 100 Z"
            fill="rgba(0,0,0,0.4)" />

      {/* roof specular */}
      <path d="M 200 40 Q 182 27 160 27 L 118 34 L 128 33
               Q 158 26 178 30 Q 196 34 198 40 Z"
            fill="rgba(255,255,255,0.09)" />

      {/* body highlight (character line) */}
      <path d="M 50 94 Q 100 88 142 78 H 216 L 264 78 L 272 86
               L 265 78 L 214 68 L 140 76 Q 96 86 48 96 Z"
            fill="rgba(255,255,255,0.035)" />

      {/* cabin glass */}
      <path d="M 206 63 L 196 40 Q 180 28 160 28
               L 118 34 L 94 52 Q 84 62 76 74 Z"
            fill="url(#pr-gl)" />

      {/* B-pillar */}
      <rect x="148" y="33" width="5" height="30" rx="1" fill="#04040C" />

      <path d="M 170 29 L 162 30 L 194 63 L 200 63 Z" fill="rgba(255,255,255,0.065)" />
      <path d="M 126 34 L 118 36 L 94 54 L 104 51 Z" fill="rgba(255,255,255,0.065)" />

      {/* gold window surround */}
      <path d="M 206 63 L 196 40 Q 180 28 160 28
               L 118 34 L 94 52 Q 84 62 76 74 Z"
            stroke="url(#pr-go)" strokeWidth="1.2" fill="none" opacity="0.55" />

      {/* gold belt line — luxury signature */}
      <path d="M 50 94 Q 98 90 140 78 H 215 L 264 78"
            stroke="url(#pr-go)" strokeWidth="1.5" fill="none" opacity="0.65" />

      <Wheel cx={76} cy={130} r={25} n={5} rim="#1A1A26" />
      <Wheel cx={242} cy={130} r={25} n={5} rim="#1A1A26" />

      {/* gold rim rings */}
      <circle cx={76} cy={130} r={22} fill="none" stroke="#C4A265" strokeWidth="1.6" opacity="0.52" />
      <circle cx={242} cy={130} r={22} fill="none" stroke="#C4A265" strokeWidth="1.6" opacity="0.52" />

      {/* blade headlight */}
      <path d="M 272 88 L 276 94 L 275 108 L 271 86 Z" fill="#C8DFFF" fillOpacity="0.9" />
      <rect x="273" y="88" width="2.5" height="6" rx="1" fill="white" fillOpacity="0.6" />

      {/* ambient DRL */}
      <path d="M 266 72 L 274 75 L 274 80 L 264 77 Z" fill="#A8C4FF" fillOpacity="0.6" />

      {/* tail light blade */}
      <rect x="44" y="100" width="3" height="28" rx="1" fill="#880000" fillOpacity="0.88" />
      <rect x="44" y="101" width="1.5" height="10" rx="0.5" fill="#FF2222" />

      <line x1="148" y1="63" x2="146" y2="114" stroke="rgba(4,4,12,0.65)" strokeWidth="1.2" />

      {/* mirror — sculpted */}
      <path d="M 222 65 Q 229 61 233 65 L 232 72 L 220 72 Z"
            fill="#0C0C1A" stroke="#C4A265" strokeWidth="0.4" />
    </svg>
  )
}

/* ── Premium Van ── luxury MPV · platinum silver ──────────────────────────── */
function PremiumVan(): ReactElement {
  return (
    <svg viewBox="0 0 320 170" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vn-bd" x1="160" y1="38" x2="160" y2="140" gradientUnits="userSpaceOnUse">
          <stop stopColor="#929AAC" />
          <stop offset="0.4" stopColor="#686E80" />
          <stop offset="1" stopColor="#464A56" />
        </linearGradient>
        <linearGradient id="vn-rf" x1="160" y1="36" x2="160" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B0B8C8" />
          <stop offset="1" stopColor="#8A9098" />
        </linearGradient>
        <linearGradient id="vn-gl" x1="140" y1="38" x2="188" y2="76" gradientUnits="userSpaceOnUse">
          <stop stopColor="#161E3A" />
          <stop offset="1" stopColor="#090C1C" />
        </linearGradient>
      </defs>

      <ellipse cx="160" cy="158" rx="132" ry="9" fill="rgba(0,0,0,0.28)" />

      {/* body — tall boxy MPV */}
      <path d="M 46 108 Q 42 118 44 132 L 48 138 H 268 L 272 132
               Q 276 118 272 108 L 272 58 Q 270 46 260 42
               L 244 38 L 94 38 Q 80 38 72 48
               L 58 66 Q 50 76 48 90 Z"
            fill="url(#vn-bd)" />

      {/* rear face depth */}
      <path d="M 46 108 Q 42 118 44 132 L 48 138 L 64 138
               L 64 70 L 56 70 L 48 90 Z"
            fill="rgba(0,0,0,0.28)" />

      {/* roof top plane (3-D effect) */}
      <path d="M 72 48 L 94 38 H 244 L 260 42 L 264 50 H 70 Z"
            fill="url(#vn-rf)" />

      {/* roof highlight strip */}
      <rect x="96" y="38" width="146" height="3" rx="1.5" fill="rgba(255,255,255,0.16)" />

      {/* windshield — front face visible in ¾ view */}
      <path d="M 248 38 L 260 42 Q 270 47 272 58 L 272 78 L 248 78 L 248 38 Z"
            fill="url(#vn-gl)" />
      <path d="M 252 40 L 262 44 L 265 54 L 250 50 Z" fill="rgba(255,255,255,0.10)" />

      {/* side windows — wide luxury panes */}
      <path d="M 78 40 H 108 L 108 74 H 78 Z" fill="url(#vn-gl)" />
      <path d="M 112 40 H 155 L 155 74 H 112 Z" fill="url(#vn-gl)" />
      <path d="M 159 40 H 202 L 202 74 H 159 Z" fill="url(#vn-gl)" />
      <path d="M 206 40 H 244 L 244 74 H 206 Z" fill="url(#vn-gl)" />

      {/* pillars */}
      <rect x="76" y="38" width="4" height="36" rx="1" fill="#434750" />
      <rect x="108" y="38" width="4" height="36" rx="1" fill="#434750" />
      <rect x="155" y="38" width="4" height="36" rx="1" fill="#434750" />
      <rect x="202" y="38" width="4" height="36" rx="1" fill="#434750" />
      <rect x="244" y="38" width="4" height="40" rx="1" fill="#434750" />

      {/* glass glare per pane */}
      <path d="M 82 40 H 90 L 78 52 V 40 Z" fill="rgba(255,255,255,0.09)" />
      <path d="M 116 40 H 125 L 112 54 V 40 Z" fill="rgba(255,255,255,0.07)" />
      <path d="M 163 40 H 172 L 159 54 V 40 Z" fill="rgba(255,255,255,0.07)" />
      <path d="M 210 40 H 220 L 206 56 V 40 Z" fill="rgba(255,255,255,0.07)" />

      {/* chrome window surround */}
      <rect x="76" y="38" width="172" height="36" fill="none"
            stroke="rgba(255,255,255,0.20)" strokeWidth="0.8" />

      <Wheel cx={74} cy={130} r={26} n={7} rim="#363A48" />
      <Wheel cx={248} cy={130} r={26} n={7} rim="#363A48" />

      {/* LED headlight block */}
      <rect x="270" y="48" width="4" height="24" rx="2" fill="#DCEcFF" fillOpacity="0.88" />
      <rect x="270" y="48" width="2" height="10" rx="1" fill="white" fillOpacity="0.72" />
      <path d="M 268 44 H 274 V 48 H 268 Z" fill="#B8CEFF" fillOpacity="0.68" />

      {/* tail light — vertical slab */}
      <rect x="44" y="52" width="3" height="40" rx="1.5" fill="#BB0000" fillOpacity="0.82" />
      <rect x="44" y="52" width="1.5" height="14" rx="0.75" fill="#FF3333" />

      {/* door seams */}
      <line x1="108" y1="74" x2="108" y2="122" stroke="rgba(36,40,50,0.6)" strokeWidth="1.2" />
      <line x1="159" y1="74" x2="159" y2="122" stroke="rgba(36,40,50,0.6)" strokeWidth="1.2" />
      <line x1="206" y1="74" x2="206" y2="122" stroke="rgba(36,40,50,0.6)" strokeWidth="1.2" />

      {/* chrome belt line */}
      <path d="M 48 94 H 270" stroke="rgba(255,255,255,0.15)" strokeWidth="1.2" />
      <path d="M 50 114 H 270" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />

      {/* large van mirror */}
      <path d="M 66 68 Q 54 65 50 70 L 50 76 L 68 76 Z"
            fill="#585E6E" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" />
    </svg>
  )
}

export default function VehicleIllustration({ type, className, style }: Props): ReactElement {
  return (
    <div className={className} style={style}>
      {type === 'economy' && <Economy />}
      {type === 'comfort' && <Comfort />}
      {type === 'premium' && <Premium />}
      {type === 'van' && <PremiumVan />}
    </div>
  )
}
