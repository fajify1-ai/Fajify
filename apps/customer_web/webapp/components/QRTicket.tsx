import { useDialogFocus } from './useDialogFocus'
import { QRCodeSVG } from 'qrcode.react'

export interface QRTicketProps {
  type: 'booking' | 'ride' | 'delivery'
  title: string
  subtitle: string
  detail1: string
  detail2: string
  reference: string
  qrValue: string
  accent: string
  dark: boolean
  onClose: () => void
  transportAdded?: boolean
  transportCta?: () => void
}

export default function QRTicket({ type, title, subtitle, detail1, detail2, reference: refCode, qrValue, accent, dark, onClose, transportAdded, transportCta }: QRTicketProps) {
  const surface = dark ? '#1A1A1A' : '#FFFFFF'
  const ink     = dark ? '#F0F0F0' : '#1A1A1A'
  const muted   = dark ? '#777'    : '#888'
  const bg      = dark ? '#0A0A0A' : '#F0F0F4'
  const sep     = dark ? '#252525' : '#E8E8E8'

  const typeLabel = type === 'booking' ? 'Booking Ticket' : type === 'ride' ? 'Ride Pass' : 'Delivery Pass'

  const iconPath = type === 'booking'
    ? 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
    : type === 'ride'
    ? 'M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v5h2M16 21a2 2 0 100-4 2 2 0 000 4M5 21a2 2 0 100-4 2 2 0 000 4M3 13h18'
    : 'M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM1 10h22'

  const dialogRef = useDialogFocus(true, onClose)
  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Demo ticket" className="fixed inset-0 z-50 flex flex-col items-center justify-center max-w-[430px] mx-auto px-5"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}>

      {/* Ticket card */}
      <div className="w-full rounded-[28px] overflow-hidden" style={{ background: surface, boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>

        {/* Header band */}
        <div className="px-6 py-5 flex items-center justify-between"
          style={{ background: accent }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-[12px] bg-white/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={iconPath} />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest">{typeLabel}</p>
              <p className="text-[16px] font-black text-white leading-tight">{title}</p>
            </div>
          </div>
          <button aria-label="Close" onClick={onClose} className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
            <svg width="13" height="13" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Details row */}
        <div className="grid grid-cols-2 divide-x px-0" style={{ borderBottom: `1px solid ${sep}`, borderColor: sep }}>
          {[{ label: 'Details', val: detail1 }, { label: 'When', val: detail2 }].map(item => (
            <div key={item.label} className="px-5 py-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: muted }}>{item.label}</p>
              <p className="text-[13px] font-black leading-snug" style={{ color: ink }}>{item.val}</p>
            </div>
          ))}
        </div>

        {/* Perforation */}
        <div className="relative flex items-center" style={{ borderTop: `1px dashed ${sep}`, borderBottom: `1px dashed ${sep}`, margin: '0', height: 0 }}>
          <div className="absolute -left-4 h-8 w-8 rounded-full" style={{ background: bg }} />
          <div className="absolute -right-4 h-8 w-8 rounded-full" style={{ background: bg }} />
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center py-6 px-6">
          <div className="rounded-[20px] p-4 mb-4" style={{ background: '#FFFFFF', boxShadow: `0 0 0 3px ${accent}30` }}>
            <QRCodeSVG
              value={qrValue}
              size={160}
              bgColor="#FFFFFF"
              fgColor="#1A1A1A"
              level="M"
            />
          </div>
          <p className="text-[13px] font-black tracking-widest mb-1" style={{ color: ink }}>{subtitle}</p>
          <p className="text-[11px] font-bold" style={{ color: muted }}>{refCode}</p>
          <p className="text-[10px] mt-2 text-center px-4 leading-relaxed" style={{ color: muted }}>
            Demo ticket · This QR code is not valid for entry
          </p>
        </div>

        {/* Transport upsell — only when not added */}
        {type === 'booking' && !transportAdded && transportCta && (
          <div className="mx-5 mb-3 rounded-[16px] p-4 flex items-center gap-3"
            style={{ background: dark ? '#1A1410' : '#FFF8F0', border: '1.5px solid #F59E0B40' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[20px]"
              style={{ background: dark ? '#2A1E0A' : '#FEF3C7' }}>🚗</div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-black" style={{ color: dark ? '#FCD34D' : '#92400E' }}>No transport booked</p>
              <p className="text-[11px]" style={{ color: dark ? '#A07830' : '#B45309' }}>Add a ride to the venue from ₦6,500</p>
            </div>
            <button onClick={transportCta}
              className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black text-white"
              style={{ background: '#F59E0B' }}>
              Add
            </button>
          </div>
        )}

        {/* Transport confirmed badge */}
        {type === 'booking' && transportAdded && (
          <div className="mx-5 mb-3 rounded-[16px] px-4 py-3 flex items-center gap-2"
            style={{ background: dark ? '#0A1A0A' : '#F0FDF4', border: '1.5px solid #86efac' }}>
            <span className="text-[16px]">🚗</span>
            <p className="text-[12px] font-bold text-green-700">Transport included with this booking</p>
          </div>
        )}

        {/* Footer */}
        <div className="mx-5 mb-5 rounded-[14px] flex items-center justify-between px-4 py-3" style={{ background: accent + '12', border: `1px solid ${accent}30` }}>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full flex items-center justify-center" style={{ background: accent }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <p className="text-[11px] font-bold" style={{ color: accent }}>fajify Verified</p>
          </div>
          <p className="text-[11px] font-bold" style={{ color: muted }}>fajify.app</p>
        </div>
      </div>
    </div>
  )
}
