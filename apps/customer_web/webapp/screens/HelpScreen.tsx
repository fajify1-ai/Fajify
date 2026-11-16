import type { NavigateFn } from '../App'
import BottomNav from '../components/BottomNav'
import { IconGlyph, type IconName } from '../components/Icons'
import { useDarkMode } from '../store/darkMode'

type Props = { navigate: NavigateFn }

const topics = [
  { icon: 'calendar', title: 'How to make a booking', desc: 'Step-by-step guide to reserving tables, events and venues' },
  { icon: 'card', title: 'Payment & Refunds', desc: 'Accepted payment methods, refund timelines and policies' },
  { icon: 'more', title: 'Cancellations', desc: 'How to cancel a booking and understand our cancellation policy' },
  { icon: 'tag', title: 'How to use promo codes', desc: 'Apply discount codes and check their validity' },
  { icon: 'user', title: 'Account & Profile', desc: 'Edit your profile, change email, password and preferences' },
  { icon: 'message', title: 'Other Questions', desc: 'Browse all FAQs or ask us anything' },
]

export default function HelpScreen({ navigate }: Props) {
  const { dark } = useDarkMode()

  const bg      = dark ? '#0F0F0F' : '#F8F8F8'
  const surface = dark ? '#1C1C1C' : '#FFFFFF'
  const ink     = dark ? '#F0F0F0' : '#1F1F1F'
  const muted   = dark ? '#888' : '#777477'
  const border  = dark ? '#2A2A2A' : '#E8E8E8'
  const iconBg  = dark ? '#2A2A2A' : '#F3F3F3'
  const inputBg = dark ? '#2A2A2A' : '#FFFFFF'

  return (
    <div className="min-h-screen w-full pb-24 md:pl-24" style={{ background: bg, fontFamily: "'Montserrat:Regular', sans-serif" }}>
      <div className="flex items-center gap-3 px-5 pb-4 pt-14 md:px-10 md:pt-8 lg:px-16" style={{ background: surface, borderBottom: `1px solid ${border}` }}>
        <button onClick={() => navigate({ name: 'profile' })} className="grid h-10 w-10 place-items-center rounded-full border" style={{ borderColor: border }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="2.2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: ink }}>Help & Support</h1>
          <p style={{ margin: 0, fontSize: 13, color: muted }}>How can we help you today?</p>
        </div>
      </div>

      <div className="w-full px-5 pb-28 pt-6 md:px-10 lg:px-16">
        <div style={{ position: 'relative', marginBottom: 22 }}>
          <input aria-label="Search for help..." placeholder="Search for help..."
            style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: `1.5px solid ${border}`, background: inputBg, fontSize: 14, color: ink, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Popular Topics</p>

        <div className="grid grid-cols-1 gap-3 mb-6 md:grid-cols-2">
          {topics.map(t => (
            <button key={t.title} style={{ background: surface, borderRadius: 14, border: `1px solid ${border}`, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconGlyph name={t.icon as IconName} size={20} color="#FA3F38" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: ink }}>{t.title}</p>
                <p style={{ margin: 0, fontSize: 12, color: muted }}>{t.desc}</p>
              </div>
              <span style={{ fontSize: 16, color: muted }}>›</span>
            </button>
          ))}
        </div>

        <div style={{ background: 'linear-gradient(135deg, #FA3F38, #e8a045)', borderRadius: 18, padding: '20px', color: '#fff', textAlign: 'center' }}>
          <span style={{ fontSize: 32 }}>💬</span>
          <p style={{ margin: '10px 0 6px', fontSize: 16, fontWeight: 700 }}>Still need help?</p>
          <p style={{ margin: '0 0 16px', fontSize: 13, opacity: 0.9 }}>Chat with our support team — we typically reply in under 2 minutes.</p>
          <button style={{ padding: '11px 28px', borderRadius: 999, background: '#fff', color: '#FA3F38', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
            Chat with Support
          </button>
        </div>
      </div>

      <BottomNav active="profile" navigate={navigate} />
    </div>
  )
}
