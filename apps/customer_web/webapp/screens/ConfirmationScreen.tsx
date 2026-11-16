import { useState } from 'react'
import type { NavigateFn } from '../App'
import { useDarkMode } from '../store/darkMode'

type Props = {
  type: 'reservation' | 'event'
  details: Record<string, string>
  navigate: NavigateFn
}

const RED = '#FA3F38'
const BOOKING_ID = '#SR1035132090'

export default function ConfirmationScreen({ details, navigate }: Props) {
  const { dark } = useDarkMode()
  const [copied, setCopied] = useState(false)

  const bg      = dark ? '#0F0F0F' : '#F8F8F8'
  const surface = dark ? '#1C1C1C' : '#FFFFFF'
  const ink     = dark ? '#F0F0F0' : '#1A1A1A'
  const muted   = dark ? '#888' : '#888888'
  const border  = dark ? '#2A2A2A' : '#EEEEEE'
  const pinkBg  = dark ? '#2A1010' : '#FFE8E8'
  const infoBg  = dark ? '#2A1010' : '#FFF5F5'
  const infoBorder = dark ? '#4A2020' : '#FFD6D4'

  const venue   = details.venue    ?? 'Shiro Restaurant'
  const dateStr = details.date     ?? 'Sat, 17 May 2025'
  const time    = details.time     ?? '07:00 PM'
  const guests  = details.guests   ?? '2'
  const seating = details.seating  ?? 'Indoor'

  const copy = () => {
    navigator.clipboard?.writeText(BOOKING_ID).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen max-w-[430px] mx-auto font-[family-name:var(--font-ui)]" style={{ background: bg }}>
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 z-10 px-5 pt-14 pb-4" style={{ background: surface, borderBottom: `1px solid ${border}` }}>
        <button aria-label="Back to discovery" onClick={() => navigate({ name: 'home' })}
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: bg, border: `1px solid ${border}` }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h1 className="text-[18px] font-black" style={{ color: ink }}>Booking Confirmed</h1>
        <button className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: bg, border: `1px solid ${border}` }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        </button>
      </div>

      <div className="overflow-y-auto pb-10 [scrollbar-width:none]">
        {/* Checkmark circle — pink bg with red check */}
        <div className="flex justify-center pt-8 pb-6">
          <div className="relative">
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full scale-110 opacity-40" style={{ background: pinkBg }} />
            {/* Main circle */}
            <div className="relative h-[96px] w-[96px] rounded-full flex items-center justify-center" style={{ background: pinkBg }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            {/* Small decorative dots */}
            <div className="absolute -top-1 -left-3 h-2 w-2 rounded-full" style={{ background: pinkBg }} />
            <div className="absolute bottom-2 -right-4 h-3 w-3 rounded-full opacity-60" style={{ background: pinkBg }} />
          </div>
        </div>

        {/* Reservation Summary card */}
        <div className="mx-5 rounded-[18px] overflow-hidden" style={{ background: surface, border: `1px solid ${border}` }}>
          <div className="px-5 py-4">
            <p className="text-[16px] font-black mb-4" style={{ color: ink }}>Reservation Summary</p>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-[14px]" style={{ color: muted }}>Restaurant</span>
                <span className="text-[14px] font-bold" style={{ color: ink }}>{venue}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[14px]" style={{ color: muted }}>Date & Time</span>
                <span className="text-[14px] font-bold" style={{ color: ink }}>{dateStr} · {time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[14px]" style={{ color: muted }}>Guest</span>
                <span className="text-[14px] font-bold" style={{ color: ink }}>{guests} Guest</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[14px]" style={{ color: muted }}>Seating</span>
                <span className="text-[14px] font-bold" style={{ color: ink }}>{seating}</span>
              </div>
            </div>

            {/* Divider */}
            <div className="my-4 border-t" style={{ borderColor: border }} />

            {/* Booking ID row */}
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold" style={{ color: ink }}>Booking ID</span>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-black" style={{ color: RED }}>{BOOKING_ID}</span>
                <button onClick={copy} className="p-1 rounded">
                  {copied ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save this information banner */}
        <div className="mx-5 mt-4 flex items-start gap-3 rounded-[14px] px-4 py-3.5" style={{ background: infoBg, border: `1px solid ${infoBorder}` }}>
          <div className="mt-0.5 shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div>
            <p className="text-[13px] font-bold mb-0.5" style={{ color: ink }}>Save this information</p>
            <p className="text-[12px]" style={{ color: muted }}>Demo confirmation · No email is sent</p>
          </div>
        </div>

        {/* What's Next? */}
        <div className="mx-5 mt-6">
          <p className="text-[18px] font-black mb-3" style={{ color: ink }}>{"What's Next?"}</p>
          <div className="flex flex-col gap-3">
            {[
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                ),
                title: 'Book a Ride',
                subtitle: `Get a ride to ${venue}`,
                action: () => navigate({ name: 'transportation', venueId: '', bookingDetails: details }),
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
                ),
                title: 'View My Booking',
                subtitle: 'See booking details and QR code',
                action: () => navigate({ name: 'myTickets' }),
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                ),
                title: 'Share Reservation',
                subtitle: 'Share your reservation with friends',
                action: () => navigate({ name: 'inviteFriends' }),
              },
            ].map(item => (
              <button key={item.title} onClick={item.action}
                className="flex items-center gap-4 rounded-[16px] px-4 py-4 w-full text-left"
                style={{ background: surface, border: `1px solid ${border}` }}>
                <div className="h-11 w-11 shrink-0 rounded-[12px] flex items-center justify-center" style={{ background: infoBg }}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-bold" style={{ color: ink }}>{item.title}</p>
                  <p className="text-[12px]" style={{ color: muted }}>{item.subtitle}</p>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            ))}
          </div>
        </div>

        {/* Back to Home — full width red button */}
        <div className="mx-5 mt-6">
          <button aria-label="Back to discovery" onClick={() => navigate({ name: 'home' })}
            className="w-full rounded-[16px] py-4 text-[16px] font-black text-white"
            style={{ background: RED }}>
            Back to Home
          </button>
        </div>
      </div>

    </div>
  )
}
