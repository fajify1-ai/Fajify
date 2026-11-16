import type { ReactNode } from 'react'
import type { NavigateFn } from '../App'
import BottomNav from '../components/BottomNav'
import { IconHeart, IconMapPin, IconStar } from '../components/Icons'
import { useSaved } from '../store/saved'
import { useDarkMode } from '../store/darkMode'

export type SavedPlace={id:string;name:string;type:string;location:string;rating?:number;price:string;tag:string;image?:string;imageAlt?:string};
type Props = { navigate: NavigateFn; liveItems?:SavedPlace[]; onRemove?:(id:string)=>void; onOpen?:(id:string)=>void; status?:ReactNode; pagination?:ReactNode }

const RED = '#FA3F38'

const ALL_ITEMS = [
  { id: 'v1', name: 'Shiro Lagos', type: 'Restaurant', location: 'Victoria Island, Lagos', rating: 4.8, price: '₦25,000+', tag: 'Fine Dining', image: '/reference/d261161779a77159.jpg' },
  { id: 'v2', name: 'Landmark Beach', type: 'Beach', location: 'Lekki, Lagos', rating: 4.7, price: '₦5,000+', tag: 'Beach', image: '/reference/c3446af77f055aeb.jpg' },
  { id: 'v3', name: 'Nok by Alara', type: 'Restaurant', location: 'Ikoyi, Lagos', rating: 4.9, price: '₦30,000+', tag: 'Rooftop', image: '/reference/aa8646b5e14e1ece.jpg' },
  { id: 'v4', name: 'Muri Okunola Park', type: 'Park', location: 'Victoria Island, Lagos', rating: 4.5, price: 'Free', tag: 'Outdoor', image: '/reference/6180e163ba98cb2e.jpg' },
  { id: 'v5', name: 'Hard Rock Cafe', type: 'Bar', location: 'Oniru Estate, Lagos', rating: 4.6, price: '₦15,000+', tag: 'Bar & Grill', image: '/reference/8f9d282ee94dc4b1.jpg' },
  { id: 't1', name: 'Ilashe Beach Resort', type: 'Beach', location: 'Lagos Island', rating: 4.9, price: '₦45,000', tag: 'Resort', image: '/reference/078993e3b42ca4da.jpg' },
  { id: 't2', name: 'The Island Club', type: 'Club', location: 'Ikoyi, Lagos', rating: 4.8, price: '₦60,000+', tag: 'Exclusive', image: '/reference/3b9d79c3bbe5d029.jpg' },
  { id: 's1', name: 'Azure Beach Club', type: 'Beach', location: 'Lekki, Lagos', rating: 4.7, price: '₦35,000', tag: 'Beach Club', image: '/reference/c3446af77f055aeb.jpg' },
  { id: 'e1', name: 'Art Lagos Festival', type: 'Event', location: 'Balmoral Convention Centre', rating: 4.6, price: 'Free', tag: 'Art', image: '/reference/23affd04f9b5f094.jpg' },
  { id: 'e2', name: 'Friday Jazz Night', type: 'Event', location: 'Terra Kulture · Victoria Island', rating: 4.5, price: 'Free', tag: 'Music', image: '/reference/c3ee10e640903be0.jpg' },
]

const TABS = ['All', 'Restaurant', 'Beach', 'Event', 'Park', 'Club']

export default function WishlistScreen({ navigate, liveItems, onRemove, onOpen, status, pagination }: Props) {
  const { isSaved, toggle } = useSaved()
  const { dark } = useDarkMode()
  const saved:SavedPlace[] = liveItems ?? ALL_ITEMS.filter(item => isSaved(item.id))

  const bg      = dark ? '#0F0F0F' : '#F8F8F8'
  const surface = dark ? '#1C1C1C' : '#FFFFFF'
  const ink     = dark ? '#F0F0F0' : '#1A1A1A'
  const muted   = liveItems ? (dark?'#AAA':'#666') : (dark?'#888':'#888')
  const border  = dark ? '#2A2A2A' : '#F0F0F0'

  return (
    <div data-original-screen={liveItems!==undefined?true:undefined} className="min-h-screen w-full pb-24 pl-0 font-[family-name:var(--font-ui)] md:pl-24" style={{ background: bg }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-5 pt-14 pb-4 md:px-10 md:pt-8 lg:px-16" style={{ background: surface, borderBottom: `1px solid ${border}` }}>
        <div className="mx-auto max-w-7xl">
        <h1 className="text-[24px] font-black tracking-[-0.03em] md:text-[32px]" style={{ color: ink }}>Saved places</h1>
        <p className="text-[13px] mt-0.5" style={{ color: muted }}>{saved.length} saved {saved.length === 1 ? 'place' : 'places'}</p>
        </div>
      </div>

      {status}
      {/* Content */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-5 pt-6 pb-32 md:grid-cols-2 md:px-10 lg:grid-cols-3 lg:px-16">
        {saved.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center md:col-span-2 lg:col-span-3">
            <div className="h-20 w-20 rounded-full flex items-center justify-center mb-4" style={{ background: '#FFF1F0' }}>
              <IconHeart size={36} color={RED} filled={false} />
            </div>
            <h2 className="text-[20px] font-bold mb-2" style={{ color: ink }}>Nothing saved yet</h2>
            <p className="text-[14px] max-w-[220px]" style={{ color: muted }}>Tap the heart on any venue or event to save it here.</p>
            <button aria-label="Back to discovery" onClick={() => navigate({ name: 'home' })}
              className="mt-6 rounded-2xl px-6 py-3 text-[14px] font-bold text-white"
              style={{ background: liveItems ? '#D92D27' : RED }}>
              Explore places
            </button>
          </div>
        ) : (
          saved.map(item => (
            <article key={item.id}
              onClick={liveItems ? undefined : () => navigate({ name: 'restaurant', id: item.id })}
              className="overflow-hidden rounded-[18px] cursor-pointer shadow-[0_4px_16px_rgba(30,15,15,.07)]"
              style={{ background: surface, border: `1px solid ${border}` }}>
              <div className="relative h-[190px]">
                {item.image ? <img src={item.image} alt={item.imageAlt??item.name} className="h-full w-full object-cover" /> : <div className="h-full w-full grid place-items-center"><p style={{color:muted}}>Image not published</p></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <button aria-label={`Remove ${item.name} from saved places`} onClick={e => { e.stopPropagation(); if(liveItems)onRemove?.(item.id);else toggle(item.id) }}
                  className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md">
                  <IconHeart size={17} color={RED} filled={liveItems!==undefined || isSaved(item.id)} />
                </button>
                <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-0.5 text-[11px] font-bold text-[#333]">{item.tag}</span>
              </div>
              <div className="px-4 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <button className="text-[16px] font-bold text-left" style={{ color: ink }} onClick={()=>onOpen?onOpen(item.id):navigate({name:'restaurant',id:item.id})}>{item.name}</button>
                    <p className="mt-0.5 flex items-center gap-1 text-[12px]" style={{ color: muted }}>
                      <IconMapPin size={12} color={muted} />{item.location}
                    </p>
                  </div>
                  <span className="text-[14px] font-black" style={{ color: liveItems?'#C82924':RED }}>{item.price}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  {item.rating!==undefined&&<span className="flex items-center gap-1 text-[12px] font-semibold text-[#e8a045]">
                    <IconStar size={13} color="#e8a045" />{item.rating}
                  </span>}
                  <button onClick={e => { e.stopPropagation(); onOpen?onOpen(item.id):navigate({ name: 'reservation', venueId: item.id }) }}
                    className="rounded-full px-4 py-2 text-[12px] font-bold text-white"
                    style={{ background: liveItems ? '#D92D27' : RED }}>
                    Book Now
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {pagination}
      <BottomNav highContrast={liveItems!==undefined} active="search" navigate={navigate} />
    </div>
  )
}
