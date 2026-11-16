import type {ReactNode} from 'react'
import { addBooking, cancelBooking, useBookings } from '../store/bookings'
import { useState } from 'react'
import type { NavigateFn } from '../App'
import { getEvent } from '../data'
import { IconArrowLeft, IconMapPin, IconGlyph } from '../components/Icons'

type Props = { id: string; navigate: NavigateFn; liveEvent?:NonNullable<ReturnType<typeof getEvent>>; actions?:ReactNode; remaining?:number }

export default function EventDetailScreen({ id, navigate, liveEvent, actions, remaining }: Props) {
  const evt = liveEvent??getEvent(id)
  const bookings = useBookings()
  const joined = bookings.some(booking => booking.qrValue === `FAJI:DEMO:EVENT:${id}` && booking.status === 'Upcoming')
  const [messageOpen, setMessageOpen] = useState(false)

  if (!evt) return <main className="p-8"><h1>Event unavailable</h1><button aria-label="Back to discovery" onClick={() => navigate({ name: 'home' })}>Back to discovery</button></main>

  const spotsLeft = remaining ?? evt.maxGuests - evt.guests
  const fillPct = (evt.maxGuests-spotsLeft) / evt.maxGuests

  return (
    <div data-original-screen={liveEvent?true:undefined} style={{ background: '#F8F8F8', minHeight: '100vh', maxWidth: 430, margin: '0 auto', fontFamily: "'Montserrat:Regular', sans-serif" }}>
      {/* Hero */}
      <div style={{ position: 'relative', height: 280 }}>
        {evt.image?<img src={evt.image} alt={evt.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>:<div style={{width:'100%',height:'100%',background:'#333'}}/>}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, rgba(28,20,16,0.85) 100%)' }} />
        <button aria-label="Back to discovery"
          onClick={() => navigate({ name: 'home' })}
          style={{ position: 'absolute', top: 52, left: 16, width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <IconArrowLeft size={18} color="#1F1F1F" />
        </button>
        {evt.ticketPrice > 0 && (
          <span style={{ position: 'absolute', top: 52, right: 16, background: '#FA3F38', color: '#fff', fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 999 }}>
            ₦{evt.ticketPrice.toLocaleString('en-NG')} / person
          </span>
        )}
        {evt.ticketPrice === 0 && (
          <span style={{ position: 'absolute', top: 52, right: 16, background: liveEvent?'#146C37':'#22c55e', color: '#fff', fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 999 }}>
            Free
          </span>
        )}
        <div style={{ position: 'absolute', bottom: 18, left: 18, right: 18 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, fontFamily: "'Montserrat:Bold', sans-serif", color: '#fff', lineHeight: 1.2 }}>{evt.title}</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{evt.date} · {evt.restaurantName}</p>
        </div>
      </div>

      <div style={{ padding: '20px 18px 120px' }}>
        {/* Host */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1px solid #E8E8E8', marginBottom: 18 }}>
          {evt.hostAvatar?<img src={evt.hostAvatar} alt={evt.host} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}/>:<span aria-hidden="true"><IconGlyph name="user" size={44} color="#666"/></span>}
          <div>
            <p style={{ margin: 0, fontSize: 11, color: '#777477', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hosted by</p>
            <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700, color: '#1F1F1F' }}>{evt.host}</p>
          </div>
          <button onClick={() => setMessageOpen(!messageOpen)} style={{ marginLeft: 'auto', padding: '7px 16px', borderRadius: 999, border: '1.5px solid #E8E8E8', background: '#fff', fontSize: 12, fontWeight: 600, color: '#4B4749', cursor: 'pointer', fontFamily: "'Montserrat:Regular', sans-serif" }}>
            Message
          </button>
        </div>

        {messageOpen && <p role="status">{liveEvent?'Direct host messaging is unavailable. Use Help & Support from your account.':'Messaging is a visual preview. No message is sent.'}</p>}
        {/* Description */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '16px', border: '1px solid #E8E8E8', marginBottom: 18 }}>
          <p style={{ margin: 0, fontSize: 14, color: '#1F1F1F', lineHeight: 1.65 }}>{evt.description}</p>
        </div>

        {/* Attendees */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '16px', border: '1px solid #E8E8E8', marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1F1F1F' }}>{evt.guests} going</p>
            <span style={{ fontSize: 12, color: spotsLeft <= 3 ? '#ef4444' : '#777477', fontWeight: 600 }}>
              {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
            </span>
          </div>
          <div style={{ height: 6, background: '#EFEFEF', borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ height: '100%', width: `${fillPct * 100}%`, background: fillPct >= 0.9 ? '#ef4444' : '#FA3F38', borderRadius: 999 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {evt.attendees.map((a, i) => (
              <img key={i} src={a} alt="" style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid #fff', marginLeft: i > 0 ? -10 : 0, objectFit: 'cover', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }} />
            ))}
            {evt.guests > evt.attendees.length && (
              <span style={{ fontSize: 12, color: '#777477', marginLeft: 6, fontWeight: 500 }}>+{evt.guests - evt.attendees.length} more</span>
            )}
          </div>
        </div>

        {/* Venue info */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '16px', border: '1px solid #E8E8E8' }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#777477' }}>Venue</p>
          <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#1F1F1F', fontFamily: "'Montserrat:Bold', sans-serif" }}>{evt.restaurantName}</p>
          <button disabled={!!liveEvent&&!evt.restaurantId}
            onClick={() => navigate({ name: 'restaurant', id: ({r1:'v1',r2:'v5'} as Record<string,string>)[evt.restaurantId] ?? evt.restaurantId })}
            style={{ marginTop: 8, padding: '8px 16px', borderRadius: 8, border: '1.5px solid #FA3F38', background: 'transparent', color: '#FA3F38', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Montserrat:Regular', sans-serif" }}
          >
            {liveEvent&&!evt.restaurantId?'Venue arrangements are separate':'View restaurant →'}
          </button>
        </div>
      </div>

      {/* CTA */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#fff', borderTop: '1.5px solid #E8E8E8', padding: '16px 18px 24px', zIndex: 90 }}>
        {liveEvent ? actions : joined ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, padding: '13px', borderRadius: 12, background: '#f0fdf4', border: '1.5px solid #22c55e', textAlign: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>✓ You're going!</span>
            </div>
            <button
              onClick={() => bookings.filter(booking => booking.qrValue === `FAJI:DEMO:EVENT:${id}`).forEach(booking => cancelBooking(booking.id))}
              style={{ padding: '13px 16px', borderRadius: 12, border: '1.5px solid #E8E8E8', background: '#fff', fontSize: 13, fontWeight: 600, color: '#777477', cursor: 'pointer', fontFamily: "'Montserrat:Regular', sans-serif" }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              addBooking({ id: `event-${id}-${Date.now()}`, venueId: evt.restaurantId, name: evt.title, venue: evt.restaurantName, date: evt.date, image: evt.image, price: evt.ticketPrice ? `₦${evt.ticketPrice.toLocaleString('en-NG')}` : 'Free', status: 'Upcoming', type: 'event', hasTransport: false, qrValue: `FAJI:DEMO:EVENT:${id}`, ref: `DEMO-${id}`, guests: 1 })
              navigate({ name: 'myTickets' })
            }}
            style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: '#FA3F38', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat:Regular', sans-serif" }}
          >
            {evt.ticketPrice > 0 ? `Get Ticket — ₦${evt.ticketPrice.toLocaleString('en-NG')}` : 'Join this Hangout'}
          </button>
        )}
      </div>
    </div>
  )
}
