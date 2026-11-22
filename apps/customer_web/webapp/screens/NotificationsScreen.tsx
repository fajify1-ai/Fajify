import type { ReactNode } from 'react'
import type { NavigateFn } from '../App'
import BottomNav from '../components/BottomNav'
import { IconGear, IconGlyph, type IconName } from '../components/Icons'
import { useDarkMode } from '../store/darkMode'

export type NotificationCard={id:string;title:string;body:string;time:string;read:boolean};
type Props = { navigate: NavigateFn; liveItems?: NotificationCard[]; loading?:boolean; error?:string; onRetry?:()=>void; onRead?:(id:string)=>void; pagination?:ReactNode }

const notifications = {
  Today: [
    { icon: 'ticket', color: '#FA3F38', bg: '#FFF2F1', darkBg: '#2A1010', title: 'Booking Confirmed!', body: "Your reservation at Shiro Lagos on Sep 6 is confirmed. Get ready for an amazing evening.", time: '2m ago' },
    { icon: 'tag', color: '#e8a045', bg: '#fff9ee', darkBg: '#2A2010', title: 'Special Discount Just for You', body: 'Use code DATE10 for 10% off your next date booking. Valid until Sunday!', time: '1h ago' },
    { icon: 'ticket', color: '#6366f1', bg: '#eef2ff', darkBg: '#10102A', title: 'Movie Reminder', body: "Karate Kid screening tomorrow at 7:30 PM. Don't forget to pick up your tickets.", time: '3h ago' },
  ],
  Yesterday: [
    { icon: 'heart', color: '#ef4444', bg: '#fef2f2', darkBg: '#2A1010', title: 'Someone liked your hangout', body: 'Marcus T. joined your "Friday Jazz Night" event at Terra Kulture.', time: 'Yesterday 6pm' },
    { icon: 'card', color: '#22c55e', bg: '#f0fdf4', darkBg: '#0A2A10', title: 'Payment Successful', body: 'Your payment of ₦35,000 for Ilashe Beach Day has been processed successfully.', time: 'Yesterday 2pm' },
  ],
  Earlier: [
    { icon: 'party', color: '#FA3F38', bg: '#FFF2F1', darkBg: '#2A1010', title: 'Welcome to fajify!', body: 'Start planning unforgettable outings. Browse restaurants, parks, beaches and events near you.', time: '3 days ago' },
    { icon: 'trophy', color: '#e8a045', bg: '#fff9ee', darkBg: '#2A2010', title: 'Leave a Review', body: 'How was your experience at Sky Bar Lagos? Share your thoughts to help others.', time: '5 days ago' },
    { icon: 'pin', color: '#8b5cf6', bg: '#f5f3ff', darkBg: '#1A102A', title: 'New Venue Near You', body: 'Ilashe Beach Resort is now on fajify! Perfect for a weekend getaway.', time: '1 week ago' },
  ],
}

export default function NotificationsScreen({ navigate, liveItems, loading=false, error, onRetry, onRead, pagination }: Props) {
  const { dark } = useDarkMode()

  const bg      = dark ? '#0F0F0F' : '#F8F8F8'
  const surface = dark ? '#1C1C1C' : '#FFFFFF'
  const ink     = dark ? '#F0F0F0' : '#1F1F1F'
  const muted   = dark ? '#AAA' : '#666'
  const border  = dark ? '#2A2A2A' : '#E8E8E8'
  const liveMode = liveItems !== undefined
  const items = liveItems ?? []
  const hasLiveContent = liveMode && !loading && !error && items.length > 0

  return (
    <div className="min-h-screen w-full pb-24 md:pl-24" style={{ background: bg, fontFamily: "'Montserrat:Regular', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-4 pt-14 md:px-10 md:pt-8 lg:px-16" style={{ background: surface, borderBottom: `1px solid ${border}` }}>
        <div className="flex items-center gap-3">
          <button aria-label="Back to discovery" onClick={() => navigate({ name: 'home' })} className="grid h-10 w-10 place-items-center rounded-full border" style={{ borderColor: border }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="2.2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 className="text-[24px] font-black md:text-[32px]" style={{ color: ink }}>Notifications</h1>
        </div>
        <button aria-label="Notification settings" onClick={() => navigate({ name: 'settings' })}
          style={{ width: 38, height: 38, borderRadius: '50%', background: dark ? '#2A2A2A' : '#F3F3F3', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconGear size={18} color={ink} />
        </button>
      </div>

      <div className="w-full px-5 pb-28 pt-6 md:px-10 lg:px-16">
        {loading && <div className="rounded-2xl border p-5 text-sm" role="status" aria-live="polite" style={{ background: surface, borderColor: border, color: muted }}>Loading your notifications…</div>}
        {!loading && error && <div className="rounded-2xl border p-5" role="alert" style={{ background: surface, borderColor: border, color: ink }}>
          <p className="m-0 text-sm">{error}</p>
          {onRetry && <button className="faji-outline mt-4" onClick={onRetry}>Try again</button>}
          <a className="faji-outline ml-2 mt-4 inline-block" href="/login">Sign in</a>
        </div>}
        {liveMode && !loading && !error && items.length === 0 && <div className="rounded-2xl border p-6 text-center md:p-10" style={{ background: surface, borderColor: border }}>
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full" aria-hidden="true" style={{ background: dark ? '#2A2010' : '#FFF6E7', color: dark ? '#F3C879' : '#9A6414' }}>
            <IconGlyph name="message" size={22} color={dark ? '#F3C879' : '#9A6414'} />
          </div>
          <h2 className="m-0 text-base font-bold" style={{ color: ink }}>You’re all caught up</h2>
          <p className="mb-0 mt-2 text-sm" style={{ color: muted }}>New notifications will appear here.</p>
        </div>}
        {(liveMode ? hasLiveContent : true) && Object.entries(liveMode?{'Your notifications':items.map(item=>({icon:'ticket',color:'#FA3F38',bg:'#FFF2F1',darkBg:'#2A1010',...item}))}:notifications).map(([period, items]) => (
          <div key={period} style={{ marginBottom: 24 }}>
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: muted }}>{period}</p>
            <div className="flex flex-col gap-3">
              {items.map((n, i) => (
                <div key={i} className="flex items-start gap-4 rounded-[14px] p-4 md:p-5" style={{ background: surface, border: `1px solid ${border}` }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: dark ? n.darkBg : n.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconGlyph name={n.icon as IconName} size={20} color={n.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: ink, flex: 1, paddingRight: 8 }}>{n.title}</p>
                      <span style={{ fontSize: 10, color: muted, whiteSpace: 'nowrap' }}>{n.time}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: muted, lineHeight: 1.5 }}>{n.body}</p>
                    {'id' in n && typeof n.id==='string' && 'read' in n && !n.read && <button className="faji-outline mt-3" onClick={()=>onRead?.(String(n.id))}>Mark as read</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {pagination}
      </div>

      <BottomNav highContrast={liveItems!==undefined} active="home" navigate={navigate} />
    </div>
  )
}
