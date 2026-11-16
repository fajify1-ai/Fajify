import { useState, type ReactNode } from 'react'
import type { NavigateFn } from '../App'
import BottomNav from '../components/BottomNav'
import { IconGlyph, type IconName } from '../components/Icons'

type Props = { navigate: NavigateFn; live?:{link:string;controls:ReactNode;status:ReactNode;share:()=>void} }

export default function InviteFriendsScreen({ navigate, live }: Props) {
  const [copied, setCopied] = useState(false)
  const code = live?.link??'LOVE1234'

  const copy = () => {
    if(!code)return;
    const textarea = document.createElement('textarea')
    textarea.value = code
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try { document.execCommand('copy') } finally { document.body.removeChild(textarea) }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const socials = [
    { icon: 'message', label: 'WhatsApp', color: '#25D366', bg: '#f0fdf4' },
    { icon: 'camera', label: 'Instagram', color: '#E1306C', bg: '#fdf2f8' },
    { icon: 'twitter', label: 'Twitter', color: '#1DA1F2', bg: '#eff6ff' },
    { icon: 'more', label: 'More', color: live?'#666':'#777477', bg: '#F3F3F3' },
  ]

  return (
    <div data-original-screen={!!live?true:undefined} className="min-h-screen w-full pb-24 md:pl-24" style={{ background: '#F8F8F8', fontFamily: "'Montserrat:Regular', sans-serif" }}>
      <div className="flex items-center gap-3 px-5 pb-4 pt-14 md:px-10 md:pt-8 lg:px-16" style={{ background: '#fff', borderBottom: '1px solid #E8E8E8' }}>
        <button aria-label="Back to profile" onClick={() => navigate({ name: 'profile' })} className="grid h-10 w-10 place-items-center rounded-full border border-[#E8E8E8]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F1F1F" strokeWidth="2.2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, fontFamily: "'Montserrat:Bold', sans-serif", color: '#1F1F1F' }}>Invite Friends</h1>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 pb-28 pt-8 text-center">
        {/* Illustration */}
        <div style={{ width: 200, height: 160, marginBottom: 28, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 20, top: 20, width: 90, height: 110, borderRadius: 20, overflow: 'hidden', border: '3px solid #fff', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', transform: 'rotate(-6deg)' }}>
            <img src="/reference/aeb6a3fdd5e17b5f.jpg" alt="Friends" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ position: 'absolute', right: 20, top: 10, width: 90, height: 110, borderRadius: 20, overflow: 'hidden', border: '3px solid #fff', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', transform: 'rotate(5deg)' }}>
            <img src="/reference/6248b20652d77647.jpg" alt="Date" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          {/* Heart badge */}
          <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 40, height: 40, borderRadius: '50%', background: '#FA3F38', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '3px solid #F8F8F8', zIndex: 2 }}>

          </div>
        </div>

        <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, fontFamily: "'Montserrat:Bold', sans-serif", color: '#1F1F1F' }}>
          Invite Friends,<br />{live?'Share a Gathering':'Earn Rewards'}
        </h2>
        <p style={{ margin: '0 0 32px', fontSize: 14, color: live?'#666':'#777477', lineHeight: 1.6, maxWidth: 280 }}>
          {live?'Create a private one-use invitation. It grants attendance only, never a booking, ticket or referral credit.':'Share your referral code with friends. When they make their first booking, you both earn ₦2,000 credit!'}
        </p>

        {live?.controls}
        {live?.status}
        {/* Referral code */}
        <div style={{ width: '100%', background: '#fff', borderRadius: 16, border: '1.5px dashed #FA3F38', padding: '18px 20px', marginBottom: 24 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: live?'#666':'#777477' }}>{live?'Private invitation link':'Your Referral Code'}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: live?12:28, overflowWrap:'anywhere',minWidth:0, fontWeight: 900, color: '#1F1F1F', letterSpacing: '0.1em', fontFamily: "'Montserrat:Regular', sans-serif" }}>{code||'Choose a gathering and generate a link'}</span>
            <button
              disabled={!!live&&!live.link} onClick={copy}
              style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: live?(copied?'#146C37':'#D92D27'):copied ? '#22c55e' : '#FA3F38', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat:Regular', sans-serif', transition: 'background 0.2s'" }}
            >
              {copied ? '✓ Copied!' : ' Copy'}
            </button>
          </div>
        </div>

        {/* Social share */}
        <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: live?'#666':'#777477' }}>Share via</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 32 }}>
          {socials.map(s => (
            <button key={s.label} disabled={!!live&&!live.link} onClick={()=>live?.share()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: `1.5px solid ${s.bg}` }}>
                <IconGlyph name={s.icon as IconName} size={20} color={s.color} />
              </div>
              <span style={{ fontSize: 11, color: live?'#666':'#777477', fontWeight: 500 }}>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Stats */}
        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: live?'Link use':'Friends Invited', value: live?'One person':'3', icon: 'users' },
            { label: live?'Grants':'Credits Earned', value: live?'Attendance only':'₦6,000', icon: 'wallet' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#fff', borderRadius: 14, padding: '16px', border: '1px solid #E8E8E8', textAlign: 'center' }}>
              <span style={{ fontSize: 24 }}><IconGlyph name={stat.icon as IconName} size={22} color="#ff4b45" /></span>
              <p style={{ margin: '6px 0 2px', fontSize: 22, fontWeight: 800, color: '#1F1F1F' }}>{stat.value}</p>
              <p style={{ margin: 0, fontSize: 11, color: live?'#666':'#777477' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <BottomNav highContrast={!!live} active="profile" navigate={navigate} />
    </div>
  )
}
