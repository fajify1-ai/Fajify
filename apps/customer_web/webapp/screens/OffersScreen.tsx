import { useState, type ReactNode } from 'react'
import type { NavigateFn } from '../App'
import BottomNav from '../components/BottomNav'
import { IconGlyph, type IconName } from '../components/Icons'
import { useDarkMode } from '../store/darkMode'

export type OfferCard={id?:string;pct:string;title:string;desc:string;code?:string;expiry:string;gradient:string[];icon:string};
type Props = { navigate: NavigateFn; livePromos?:OfferCard[]; status?:ReactNode; pagination?:ReactNode }

const promos:OfferCard[] = [
  { pct: '10% OFF', title: 'Get 10% Off on Date Bookings', desc: 'Book any restaurant or venue for a date and get 10% off your total bill. Valid on all venues.', code: 'DATE10', expiry: 'Expires Aug 31, 2026', gradient: ['#FA3F38', '#a03a10'], icon: 'restaurant' },
  { pct: '15% OFF', title: 'Weekend Special on All Events', desc: 'Attend any event on the weekend and enjoy 15% off. Perfect for movie nights, concerts and more.', code: 'EVENT15', expiry: 'Expires Sep 7, 2026', gradient: ['#e8a045', '#c97a1e'], icon: 'party' },
  { pct: '₦2,000 OFF', title: 'Flat ₦2,000 Off on Park Bookings', desc: 'Book a park visit and save ₦2,000. Great for a picnic or an afternoon adventure.', code: 'PARK2000', expiry: 'Expires Aug 15, 2026', gradient: ['#16a34a', '#14532d'], icon: 'globe' },
  { pct: '20% OFF', title: 'First Booking Discount', desc: 'New to fajify? Get 20% off your very first reservation. No minimum spend required.', code: 'NEWFAJIFY', expiry: 'One-time use', gradient: ['#6366f1', '#4338ca'], icon: 'heart' },
]

export default function OffersScreen({ navigate: _navigate, livePromos, status, pagination }: Props) {
  const [copied, setCopied] = useState<string | null>(null)
  const { dark } = useDarkMode()

  const bg      = dark ? '#0F0F0F' : '#F8F8F8'
  const surface = dark ? '#1C1C1C' : '#FFFFFF'
  const ink     = dark ? '#F0F0F0' : '#1F1F1F'
  const muted   = livePromos ? (dark ? '#AAA' : '#666') : (dark ? '#888' : '#777477')
  const border  = dark ? '#2A2A2A' : '#E8E8E8'
  const codeBg  = dark ? '#2A2A2A' : '#F8F8F8'
  const codeBorder = dark ? '#3A3A3A' : '#E8E8E8'

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = code; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy') } finally { document.body.removeChild(ta) }
    })
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div data-original-screen={livePromos!==undefined?true:undefined} className="min-h-screen w-full pb-24 md:pl-24" style={{ background: bg, fontFamily: "'Montserrat:Regular', sans-serif" }}>
      <div className="flex items-center gap-3 px-5 pb-4 pt-14 md:px-10 md:pt-8 lg:px-16" style={{ background: surface, borderBottom: `1px solid ${border}` }}>
        <button aria-label="Back to profile" onClick={() => _navigate({ name: 'profile' })} className="grid h-10 w-10 place-items-center rounded-full border" style={{ borderColor: border }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="2.2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: ink }}>Offers & Promos</h1>
          <p style={{ margin: 0, fontSize: 13, color: muted }}>Exclusive deals for unforgettable experiences</p>
        </div>
      </div>

      {status}
      <div className="grid w-full grid-cols-1 gap-5 px-5 pb-28 pt-6 md:grid-cols-2 md:px-10 lg:px-16">
        {(livePromos??promos).map(promo => (
          <div key={promo.id??promo.code??promo.title} style={{ background: surface, borderRadius: 18, border: `1px solid ${border}`, overflow: 'hidden' }}>
            <div style={{ background: `linear-gradient(135deg, ${promo.gradient[0]}, ${promo.gradient[1]})`, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 900, color: '#fff' }}>{promo.pct}</p>
                <p style={{ margin: 0, fontSize: 13, color: livePromos?'#fff':'rgba(255,255,255,0.85)', fontWeight: 600 }}>{promo.title}</p>
              </div>
              <IconGlyph name={promo.icon as IconName} size={32} color="rgba(255,255,255,0.8)" />
            </div>
            <div style={{ padding: '14px 18px 16px' }}>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: muted, lineHeight: 1.55 }}>{promo.desc}</p>
              <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: codeBg, border: `1.5px dashed ${codeBorder}`, justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: ink, letterSpacing: '0.08em' }}>{promo.code??'Venue terms apply'}</span>
                <button disabled={!promo.code} onClick={() => promo.code&&copyCode(promo.code)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: livePromos ? '#C82924' : '#FA3F38', fontSize: 12, fontWeight: 700 }}>
                  {promo.code ? copied === promo.code ? '✓ Copied!' : 'Copy' : 'No automatic discount'}
                </button>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 11, color: muted }}>{promo.expiry}</p>
            </div>
          </div>
        ))}
      </div>

      {pagination}
      <BottomNav highContrast={livePromos!==undefined} active="home" navigate={_navigate} />
    </div>
  )
}
