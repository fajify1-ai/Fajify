import { useState, useRef } from 'react'
import type { NavigateFn } from '../App'
import { useDarkMode } from '../store/darkMode'
import CalendarSheet, { type VenueTimeType } from '../components/CalendarSheet'
import VehicleIllustration from '../components/VehicleIllustrations'
import QRTicket from '../components/QRTicket'
import { addBooking } from '../store/bookings'
import SuccessOverlay from '../components/SuccessOverlay'

type Props = { navigate: NavigateFn; venueId: string; bookingDate?: string; bookingTime?: string }

const VENUE_TIME_MAP: Record<string, VenueTimeType> = {
  v1: 'restaurant', v2: 'beach', v3: 'cinema', v4: 'park',
  v5: 'restaurant', v6: 'bar', v7: 'cinema', v8: 'beach',
  v9: 'club', v10: 'bar',
  plan1: 'beach', plan2: 'default', plan3: 'restaurant', plan4: 'restaurant',
  plan5: 'spa', plan6: 'cinema',
  p1: 'restaurant', p2: 'restaurant', p3: 'beach', p4: 'default', p5: 'spa', p6: 'cinema',
  dominos: 'restaurant',
}

const RED = '#FA3F38'

function formatPrice(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

function DummyMap({ dark, height = 96 }: { dark: boolean; height?: number }) {
  const road  = dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)'
  const block = dark ? '#141820' : '#DDEAE0'
  const bg2   = dark ? '#1A2030' : '#E4EEF0'
  const park  = dark ? '#142014' : '#C8DCB8'
  return (
    <svg width="100%" height={height} viewBox="0 0 380 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="380" height="160" fill={bg2}/>
      <rect x="0"   y="36"  width="380" height="9"  fill={road}/>
      <rect x="0"   y="74"  width="380" height="9"  fill={road}/>
      <rect x="0"   y="114" width="380" height="11" fill={road}/>
      <rect x="62"  y="0"   width="9"  height="160" fill={road}/>
      <rect x="136" y="0"   width="9"  height="160" fill={road}/>
      <rect x="210" y="0"   width="11" height="160" fill={road}/>
      <rect x="292" y="0"   width="9"  height="160" fill={road}/>
      <rect x="0"   y="0"   width="62"  height="36" fill={block} rx="2"/>
      <rect x="71"  y="0"   width="65"  height="36" fill={block} rx="2"/>
      <rect x="145" y="0"   width="65"  height="36" fill={block} rx="2"/>
      <rect x="221" y="0"   width="71"  height="36" fill={block} rx="2"/>
      <rect x="301" y="0"   width="79"  height="36" fill={block} rx="2"/>
      <rect x="0"   y="45"  width="62"  height="29" fill={block} rx="2"/>
      <rect x="71"  y="45"  width="65"  height="29" fill={park}  rx="2"/>
      <rect x="145" y="45"  width="65"  height="29" fill={block} rx="2"/>
      <rect x="221" y="45"  width="71"  height="29" fill={block} rx="2"/>
      <rect x="301" y="45"  width="79"  height="29" fill={block} rx="2"/>
      <rect x="0"   y="83"  width="62"  height="31" fill={block} rx="2"/>
      <rect x="71"  y="83"  width="65"  height="31" fill={block} rx="2"/>
      <rect x="145" y="83"  width="65"  height="31" fill={block} rx="2"/>
      <rect x="221" y="83"  width="71"  height="31" fill={park}  rx="2"/>
      <rect x="301" y="83"  width="79"  height="31" fill={block} rx="2"/>
      <rect x="0"   y="125" width="62"  height="35" fill={block} rx="2"/>
      <rect x="71"  y="125" width="65"  height="35" fill={park}  rx="2"/>
      <rect x="145" y="125" width="65"  height="35" fill={block} rx="2"/>
      <rect x="221" y="125" width="71"  height="35" fill={block} rx="2"/>
      <rect x="301" y="125" width="79"  height="35" fill={block} rx="2"/>
      <circle cx="120" cy="56" r="6" fill={RED}/>
      <line x1="120" y1="56" x2="255" y2="106" stroke={RED} strokeWidth="2.5" strokeDasharray="6 4" opacity="0.9"/>
      <circle cx="255" cy="106" r="6" fill={RED} opacity="0.5"/>
      <circle cx="255" cy="106" r="3" fill={RED}/>
    </svg>
  )
}

const SAVED_CARDS = [
  { id: 'visa4242', type: 'visa',   last4: '4242', holder: 'Ada Okonkwo',    expiry: '09/27', color: ['#1A1A2E', '#16213E'] },
  { id: 'mc1984',   type: 'mc',     last4: '1984', holder: 'Ada Okonkwo',    expiry: '03/26', color: ['#2D1B69', '#11998E'] },
]

type VenueCheckout = {
  name: string
  location: string
  image: string
  rating: number
  inclusions: { icon: string; label: string }[]
  date: string
  time: string
  guests: string
  basePrice: number
  discount: number
}

const VENUE_DATA: Record<string, VenueCheckout> = {
  v1: {
    name: 'Shiro Lagos', location: 'Victoria Island, Lagos',
    image: '/reference/2b62efd44783a784.jpg',
    rating: 4.8,
    inclusions: [{ icon: '🍽️', label: 'Dinner for 2' }, { icon: '🥂', label: 'Welcome Drinks' }, { icon: '🎵', label: 'Live Music' }],
    date: 'Saturday, 17 May 2025', time: '07:00 PM', guests: '2 Guests', basePrice: 44500, discount: 0,
  },
  v2: {
    name: 'Landmark Beach', location: 'Lekki Waterfront, Lagos',
    image: '/reference/107d321ec04926f3.jpg',
    rating: 4.7,
    inclusions: [{ icon: '🏖️', label: 'Beach Access' }, { icon: '🚤', label: 'Boat Ride' }, { icon: '🍹', label: 'Cocktails' }],
    date: 'Saturday, 24 May 2025', time: '10:00 AM', guests: '2 People', basePrice: 45000, discount: 5000,
  },
  v3: {
    name: 'Filmhouse Cinemas', location: 'Lekki Phase 1, Lagos',
    image: '/reference/2fe88ab3c38e165b.jpg',
    rating: 4.6,
    inclusions: [{ icon: '🎬', label: '2 Movie Tickets' }, { icon: '🍿', label: 'Large Popcorn' }, { icon: '🥤', label: '2 Drinks' }],
    date: 'Friday, 23 May 2025', time: '06:00 PM', guests: '2 People', basePrice: 15000, discount: 0,
  },
  v4: {
    name: 'Muri Okunola Park', location: 'Victoria Island, Lagos',
    image: '/reference/f010665ce5edc021.jpg',
    rating: 4.5,
    inclusions: [{ icon: '⛱️', label: 'Shaded Spot' }, { icon: '🪑', label: 'Table & Chairs' }, { icon: '🎶', label: 'Live Music' }],
    date: 'Saturday, 24 May 2025', time: '11:00 AM', guests: '4 People', basePrice: 8000, discount: 0,
  },
  v5: {
    name: 'Nok by Alara', location: 'Ikoyi, Lagos',
    image: '/reference/5c8fb9b1e82578d9.jpg',
    rating: 4.9,
    inclusions: [{ icon: '🍽️', label: 'Tasting Menu' }, { icon: '🥂', label: 'Welcome Drinks' }, { icon: '🌆', label: 'Rooftop View' }],
    date: 'Saturday, 31 May 2025', time: '08:00 PM', guests: '2 Guests', basePrice: 65000, discount: 0,
  },
  v6: {
    name: 'Hard Rock Cafe', location: 'Oniru Estate, Lagos',
    image: '/reference/443fda44282c32da.jpg',
    rating: 4.6,
    inclusions: [{ icon: '🎸', label: 'Live Music' }, { icon: '🍔', label: 'Burger Platter' }, { icon: '🍹', label: '2 Cocktails' }],
    date: 'Friday, 30 May 2025', time: '07:00 PM', guests: '2 People', basePrice: 30000, discount: 0,
  },
  v7: {
    name: 'Silverbird Cinemas', location: 'Ikeja City Mall, Lagos',
    image: '/reference/b170812a3e16595e.jpg',
    rating: 4.5,
    inclusions: [{ icon: '🎬', label: '2 Movie Tickets' }, { icon: '🍿', label: 'Popcorn Combo' }, { icon: '🅿️', label: 'Parking Pass' }],
    date: 'Sunday, 25 May 2025', time: '04:00 PM', guests: '2 People', basePrice: 12000, discount: 0,
  },
  v8: {
    name: 'Ilashe Beach Resort', location: 'Snake Island, Amuwo Odofin Lagos.',
    image: '/reference/107d321ec04926f3.jpg',
    rating: 4.9,
    inclusions: [{ icon: '🏖️', label: 'Beach Access' }, { icon: '🍽️', label: 'Buffet Included' }, { icon: '🎯', label: 'All Game Activities' }],
    date: 'Saturday, 25 July 2026', time: '10:00 AM', guests: '2 People', basePrice: 100000, discount: 5000,
  },
  v9: {
    name: 'The Island Club', location: 'Ikoyi, Lagos',
    image: '/reference/0825bafdcb34efa9.jpg',
    rating: 4.8,
    inclusions: [{ icon: '🪑', label: 'Reserved Table' }, { icon: '🍾', label: 'Bottle Service' }, { icon: '🎶', label: 'Live DJ' }],
    date: 'Saturday, 31 May 2025', time: '10:00 PM', guests: '4 Guests', basePrice: 80000, discount: 0,
  },
  v10: {
    name: 'Sky Bar Lagos', location: 'Victoria Island, Lagos',
    image: '/reference/701d6cfd62aabe78.jpg',
    rating: 4.7,
    inclusions: [{ icon: '🌆', label: '360° Skyline View' }, { icon: '🍹', label: 'Welcome Cocktail' }, { icon: '🪑', label: 'Rooftop Table' }],
    date: 'Friday, 30 May 2025', time: '06:00 PM', guests: '2 People', basePrice: 32000, discount: 0,
  },
  // Browse Plans
  plan1: {
    name: 'ILASHE BEACH', location: 'Snake Island, Amuwo Odofin Lagos.',
    image: '/reference/107d321ec04926f3.jpg',
    rating: 4.4,
    inclusions: [{ icon: '🏖️', label: 'Beach Access' }, { icon: '🍽️', label: 'Buffet Included' }, { icon: '🎯', label: 'All Game Activities' }],
    date: 'Saturday, 25 July 2026', time: '10:00 AM', guests: '2 People', basePrice: 100000, discount: 5000,
  },
  plan2: {
    name: 'GAME NIGHT', location: 'Delivered to your location',
    image: '/reference/79b4f41124520968.jpg',
    rating: 4.8,
    inclusions: [{ icon: '🃏', label: 'Uno & Cards' }, { icon: '🎲', label: 'Jenga' }, { icon: '🥃', label: '6 Shot Glasses' }],
    date: 'Saturday, 24 May 2025', time: '07:00 PM', guests: '4 People', basePrice: 35000, discount: 0,
  },
  plan3: {
    name: 'FOOD TRAY', location: 'Delivered to your location',
    image: '/reference/3c497223fa17196e.jpg',
    rating: 4.6,
    inclusions: [{ icon: '🍗', label: 'Chicken Bites' }, { icon: '🍟', label: 'Seasoned Fries' }, { icon: '🥤', label: '1L Coca-Cola' }],
    date: 'Saturday, 24 May 2025', time: '12:00 PM', guests: '2 People', basePrice: 50000, discount: 0,
  },
  plan4: {
    name: 'ROOFTOP DINNER', location: 'Sky Bar Lagos, Victoria Island',
    image: '/reference/2b62efd44783a784.jpg',
    rating: 4.9,
    inclusions: [{ icon: '🍽️', label: '3-Course Dinner' }, { icon: '🎵', label: 'Live Music' }, { icon: '🌆', label: 'Skyline View' }],
    date: 'Friday, 30 May 2025', time: '07:00 PM', guests: '2 Guests', basePrice: 85000, discount: 0,
  },
  plan5: {
    name: 'SPA & RELAX DAY', location: 'Zen Spa, Victoria Island',
    image: '/reference/d50d084e2c383018.jpg',
    rating: 4.8,
    inclusions: [{ icon: '💆', label: 'Full Body Massage' }, { icon: '🧖', label: 'Facial Treatment' }, { icon: '🛁', label: 'Sauna Access' }],
    date: 'Sunday, 25 May 2025', time: '10:00 AM', guests: '1 Person', basePrice: 45000, discount: 0,
  },
  plan6: {
    name: 'CINEMA PACKAGE', location: 'Filmhouse Cinemas, Lekki',
    image: '/reference/2fe88ab3c38e165b.jpg',
    rating: 4.7,
    inclusions: [{ icon: '🎬', label: '2 Movie Tickets' }, { icon: '🍿', label: 'Large Popcorn & Drinks' }, { icon: '🅿️', label: 'Parking Pass' }],
    date: 'Saturday, 24 May 2025', time: '04:00 PM', guests: '2 People', basePrice: 18000, discount: 0,
  },
  // PlanForMe results (p1–p6)
  p1: {
    name: 'Rooftop Hangout', location: 'Lekki, Lagos',
    image: '/reference/701d6cfd62aabe78.jpg',
    rating: 4.9,
    inclusions: [{ icon: '🍽️', label: '3-Course Dinner' }, { icon: '🎵', label: 'Live Music' }, { icon: '🌆', label: 'Skyline View' }],
    date: 'Saturday, 31 May 2025', time: '07:00 PM', guests: '2 Guests', basePrice: 65000, discount: 0,
  },
  p2: {
    name: 'Garden Brunch', location: 'Victoria Island, Lagos',
    image: '/reference/2b62efd44783a784.jpg',
    rating: 4.7,
    inclusions: [{ icon: '🥂', label: 'Welcome Drinks' }, { icon: '🌿', label: 'Garden Setting' }, { icon: '🍳', label: 'Brunch Spread' }],
    date: 'Sunday, 25 May 2025', time: '11:00 AM', guests: '2 Guests', basePrice: 35000, discount: 0,
  },
  p3: {
    name: 'Island Escape', location: 'Ilashe Beach, Lagos',
    image: '/reference/107d321ec04926f3.jpg',
    rating: 4.8,
    inclusions: [{ icon: '🏖️', label: 'Beach Access' }, { icon: '🍹', label: 'Cocktails' }, { icon: '🤿', label: 'Water Sports' }],
    date: 'Saturday, 24 May 2025', time: '10:00 AM', guests: '2 People', basePrice: 50000, discount: 0,
  },
  p4: {
    name: 'Sunset Cruise', location: 'Lagos Lagoon',
    image: '/reference/f010665ce5edc021.jpg',
    rating: 4.6,
    inclusions: [{ icon: '🚢', label: 'Boat Cruise' }, { icon: '🥂', label: 'Champagne' }, { icon: '📸', label: 'Photo Session' }],
    date: 'Friday, 30 May 2025', time: '05:00 PM', guests: '2 Guests', basePrice: 80000, discount: 0,
  },
  p5: {
    name: 'Spa & Chill', location: 'Zen Spa, Victoria Island',
    image: '/reference/d50d084e2c383018.jpg',
    rating: 4.8,
    inclusions: [{ icon: '💆', label: 'Full Body Massage' }, { icon: '🧖', label: 'Facial' }, { icon: '🛁', label: 'Sauna' }],
    date: 'Sunday, 25 May 2025', time: '10:00 AM', guests: '1 Person', basePrice: 45000, discount: 0,
  },
  p6: {
    name: 'VIP Cinema Night', location: 'Filmhouse, Lekki',
    image: '/reference/2fe88ab3c38e165b.jpg',
    rating: 4.7,
    inclusions: [{ icon: '🎬', label: '2 Movie Tickets' }, { icon: '🍿', label: 'Popcorn & Drinks' }, { icon: '🅿️', label: 'Parking Pass' }],
    date: 'Saturday, 24 May 2025', time: '06:00 PM', guests: '2 People', basePrice: 25000, discount: 0,
  },
  dominos: {
    name: "Domino's Pizza", location: 'Surulere, Lagos',
    image: '/reference/feaf25105e4acad3.jpg',
    rating: 4.8,
    inclusions: [{ icon: '🍕', label: 'Fresh Pizza' }, { icon: '🚚', label: 'Fast Delivery' }, { icon: '🎉', label: 'Party Friendly' }],
    date: 'Today', time: 'ASAP (30-45 min)', guests: '2-3 People', basePrice: 64000, discount: 0,
  },
}

const FALLBACK: VenueCheckout = VENUE_DATA.v1

type MenuItem = { id: string; name: string; desc: string; price: number; image: string; emoji: string }

const VENUE_MENU: Record<string, MenuItem[]> = {
  v1: [
    { id: 'v1m1', name: 'Wagyu Beef Tenderloin', desc: 'Premium cut, seared to perfection', price: 35000, image: '/reference/7605167e1ffc703c.jpg', emoji: '🥩' },
    { id: 'v1m2', name: 'Grilled Lobster', desc: 'Fresh Atlantic lobster, garlic butter', price: 45000, image: '/reference/d9371c9e634428c5.jpg', emoji: '🦞' },
    { id: 'v1m3', name: 'Truffle Pasta', desc: 'House-made tagliatelle, black truffle', price: 28000, image: '/reference/2a00994c257f447b.jpg', emoji: '🍝' },
    { id: 'v1m4', name: 'Tuna Tartare', desc: 'Sashimi-grade tuna, avocado', price: 18000, image: '/reference/preview-tuna.svg', emoji: '🐟' },
    { id: 'v1m5', name: 'Chocolate Fondant', desc: 'Warm dark chocolate, vanilla ice cream', price: 12000, image: '/reference/8f1afb57d6d8c66a.jpg', emoji: '🍫' },
  ],
  v2: [
    { id: 'v2m1', name: 'Chilled Coconut', desc: 'Fresh coconut served chilled at the beach', price: 3500, image: '/reference/45b7b8fefaffa263.jpg', emoji: '🥥' },
    { id: 'v2m2', name: 'Beach BBQ Platter', desc: 'Grilled meats, pepper sauce, plantain', price: 18000, image: '/reference/e1f02fa16f3f4741.jpg', emoji: '🍖' },
    { id: 'v2m3', name: 'Tropical Cocktail', desc: 'Mango, passionfruit, coconut rum', price: 7500, image: '/reference/60356b6014366c89.jpg', emoji: '🍹' },
  ],
  v3: [
    { id: 'v3m1', name: 'Large Popcorn', desc: 'Buttered or caramel', price: 3500, image: '/reference/659dd001bafce28d.jpg', emoji: '🍿' },
    { id: 'v3m2', name: 'Combo Meal', desc: 'Popcorn + nachos + 2 drinks', price: 8500, image: '/reference/72addf681ebabcc3.jpg', emoji: '🥤' },
    { id: 'v3m3', name: 'Hot Dog', desc: 'Classic cinema hot dog, mustard & ketchup', price: 4000, image: '/reference/preview-hotdog.svg', emoji: '🌭' },
  ],
  v5: [
    { id: 'v5m1', name: 'Jollof Rice (Premium)', desc: 'Party jollof, assorted proteins', price: 12000, image: '/reference/8dc5b50cb9bb9c8f.jpg', emoji: '🍛' },
    { id: 'v5m2', name: 'Oxtail Pepper Soup', desc: 'Rich palm oil broth, uziza leaves', price: 15000, image: '/reference/7b36fca502b59e02.jpg', emoji: '🍲' },
    { id: 'v5m3', name: 'Signature Cocktail', desc: 'House specialty — ask your server', price: 9000, image: '/reference/60356b6014366c89.jpg', emoji: '🍸' },
  ],
  v6: [
    { id: 'v6m1', name: 'Classic Cheeseburger', desc: 'Angus beef, cheddar, special sauce', price: 9500, image: '/reference/a69b4678b29ef82c.jpg', emoji: '🍔' },
    { id: 'v6m2', name: 'Signature Cocktail', desc: 'Rock & Roll mojito or Old Fashioned', price: 8000, image: '/reference/60356b6014366c89.jpg', emoji: '🍸' },
    { id: 'v6m3', name: 'Loaded Nachos', desc: 'Jalapeño, cheese sauce, guacamole', price: 7000, image: '/reference/61b625f69a03ffb8.jpg', emoji: '🌮' },
  ],
  v9: [
    { id: 'v9m1', name: 'Bottle of Hennessy', desc: 'VS Cognac 700ml, mixers included', price: 55000, image: '/reference/preview-bottle.svg', emoji: '🥃' },
    { id: 'v9m2', name: 'Champagne (Moët)', desc: 'Moët Impérial 750ml', price: 75000, image: '/reference/604793d9cbc86b6e.jpg', emoji: '🍾' },
    { id: 'v9m3', name: 'VIP Snack Platter', desc: 'Finger foods, wings, spring rolls', price: 18000, image: '/reference/5a1153e33c9567ce.jpg', emoji: '🍗' },
  ],
  v10: [
    { id: 'v10m1', name: 'Welcome Cocktail', desc: 'House signature, passionfruit & gin', price: 8500, image: '/reference/60356b6014366c89.jpg', emoji: '🍹' },
    { id: 'v10m2', name: 'Grilled Prawns', desc: 'Tiger prawns, lemon butter, herbs', price: 22000, image: '/reference/5047cd17a1c1974a.jpg', emoji: '🦐' },
    { id: 'v10m3', name: 'Charcuterie Board', desc: 'Cured meats, cheese, fruit, crackers', price: 16000, image: '/reference/1fa6b294a1ecca9f.jpg', emoji: '🧀' },
  ],
}

export default function CheckoutScreen({ navigate, venueId, bookingDate, bookingTime }: Props) {
  const { dark } = useDarkMode()
  const [payMethod, setPayMethod] = useState('')
  const [bookingReference, setBookingReference] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [cardName, setCardName] = useState('')
  const [copiedRef, setCopiedRef] = useState(false)
  const [calOpen, setCalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | undefined>(bookingDate)
  const [selectedTime, setSelectedTime] = useState<string | undefined>(bookingTime)
  const [guests, setGuests] = useState(() => {
    const n = parseInt((VENUE_DATA[venueId] ?? FALLBACK).guests)
    return isNaN(n) ? 2 : n
  })

  // transport state machine: prompt → declined | configuring → confirmed
  type TState = 'prompt' | 'declined' | 'configuring' | 'confirmed'
  const [paid, setPaid] = useState(false)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [showTicketTransport, setShowTicketTransport] = useState(false)
  const [tState, setTState] = useState<TState>('prompt')
  const [tProvider, setTProvider] = useState<'uber' | 'bolt'>('uber')
  const [tAddrMode, setTAddrMode] = useState<'saved' | 'new'>('saved')
  const [tNewAddr, setTNewAddr]   = useState('')
  const [tCar, setTCar] = useState<'economy' | 'comfort' | 'premium' | 'premium-van'>('comfort')
  const [basket, setBasket] = useState<Record<string, number>>({})

  const menuItems = VENUE_MENU[venueId] ?? []
  const basketTotal = menuItems.reduce((sum, item) => sum + (basket[item.id] ?? 0) * item.price, 0)
  const addItem = (id: string) => setBasket(b => ({ ...b, [id]: (b[id] ?? 0) + 1 }))
  const removeItem = (id: string) => setBasket(b => { const qty = (b[id] ?? 0) - 1; if (qty <= 0) { const n = { ...b }; delete n[id]; return n } return { ...b, [id]: qty } })

  const SAVED_ADDR = '14/16 Kularu St, Eko Atlantic, Lagos'

  const CAR_TYPES = [
    { id: 'economy'     as const, label: 'Economy',     sub: '4 seat · Standard',     price: 6500,  eta: '8 min',  vehicle: 'economy'     as const },
    { id: 'comfort'     as const, label: 'Comfort',     sub: '4 seat · AC · Spacious', price: 8500,  eta: '5 min',  vehicle: 'comfort'     as const },
    { id: 'premium'     as const, label: 'Premium',     sub: '4 seat · Luxury · WiFi', price: 14000, eta: '6 min',  vehicle: 'premium'     as const },
    { id: 'premium-van' as const, label: 'Premium Van', sub: '7 seat · Luxury Group',  price: 20000, eta: '10 min', vehicle: 'premium-van' as const },
  ]
  const selectedCar = CAR_TYPES.find(c => c.id === tCar)!
  const tPickup = tAddrMode === 'saved' ? SAVED_ADDR : tNewAddr

  const bg       = dark ? '#0F0F0F' : '#F8F8F8'
  const surface  = dark ? '#1C1C1C' : '#FFFFFF'
  const ink      = dark ? '#F0F0F0' : '#1A1A1A'
  const muted    = dark ? '#888' : '#888888'
  const border   = dark ? '#2A2A2A' : '#EEEEEE'
  const inputBg  = dark ? '#252525' : '#F5F5F5'
  const lightRed = dark ? '#2A1010' : '#FFF5F5'
  const lightRedBorder = dark ? '#4A2020' : '#FFD6D4'

  const v = VENUE_DATA[venueId] ?? FALLBACK
  const transportCost = tState === 'confirmed' ? selectedCar.price : 0
  const total = v.basePrice - v.discount + transportCost + basketTotal

  const displayDate = selectedDate ?? v.date
  const displayTime = selectedTime ?? v.time

  const goBack = () => {
    if (venueId.startsWith('plan') || venueId.startsWith('p')) navigate({ name: 'browsePlans' })
    else if (venueId === 'dominos') navigate({ name: 'deliveryCart', venueId })
    else navigate({ name: 'restaurant', id: venueId })
  }

  return (
    <>
      <p role="note" className="px-5 py-2 text-center text-xs" style={{background:"#FFF1F0",color:"#902621"}}>Interactive demo · No payment, order or ride is submitted</p>
    <div className="min-h-screen max-w-[430px] mx-auto font-[family-name:var(--font-ui)]" style={{ background: bg }}>
      {/* Header */}
      <div className="flex items-center sticky top-0 z-10 px-5 pt-14 pb-4" style={{ background: surface, borderBottom: `1px solid ${border}` }}>
        <button aria-label="Go back" onClick={goBack}
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: bg, border: `1px solid ${border}` }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h1 className="flex-1 text-center text-[18px] font-black" style={{ color: ink }}>Book your Reservation</h1>
        <div className="w-10" />
      </div>

      <div className="overflow-y-auto pb-32 [scrollbar-width:none]">
        {/* Venue image */}
        <div className="mx-5 mt-5 rounded-[20px] overflow-hidden">
          <img src={v.image} alt={v.name} className="w-full h-[180px] object-cover" />
        </div>

        {/* Venue name + rating */}
        <div className="mx-5 mt-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-black" style={{ color: ink }}>{v.name}</h2>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(s => (
                <svg key={s} width="13" height="13" viewBox="0 0 24 24"
                  fill={s <= Math.round(v.rating) ? '#FFC107' : '#E0E0E0'} stroke="none">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              ))}
              <span className="text-[13px] font-semibold ml-1" style={{ color: ink }}>{v.rating}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <p className="text-[12px]" style={{ color: muted }}>{v.location}</p>
          </div>
        </div>

        {/* What's Included */}
        <div className="mx-5 mt-4 rounded-[18px] p-4" style={{ background: surface, border: `1px solid ${border}` }}>
          <p className="text-[15px] font-black mb-3" style={{ color: ink }}>{"What's Included"}</p>
          <div className="grid grid-cols-3 gap-3">
            {v.inclusions.map(item => (
              <div key={item.label} className="flex flex-col items-center gap-2 rounded-[12px] py-3 px-2 text-center"
                style={{ background: bg, border: `1px solid ${border}` }}>
                <span className="text-[24px]">{item.icon}</span>
                <span className="text-[11px] font-semibold leading-tight" style={{ color: ink }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Menu Basket ── */}
        {menuItems.length > 0 && (
          <div className="mx-5 mt-4 rounded-[18px] p-4" style={{ background: surface, border: `1px solid ${border}` }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[15px] font-black" style={{ color: ink }}>Add to your order</p>
              {basketTotal > 0 && (
                <span className="text-[12px] font-bold px-2.5 py-0.5 rounded-full text-white" style={{ background: RED }}>
                  {formatPrice(basketTotal)}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {menuItems.map(item => {
                const qty = basket[item.id] ?? 0
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="relative h-[60px] w-[60px] rounded-[12px] overflow-hidden shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      {qty > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center"
                          style={{ background: 'rgba(0,0,0,0.45)' }}>
                          <span className="text-white font-black text-[16px]">{qty}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold truncate" style={{ color: ink }}>{item.name}</p>
                      <p className="text-[11px] truncate" style={{ color: muted }}>{item.desc}</p>
                      <p className="text-[13px] font-black mt-0.5" style={{ color: RED }}>{formatPrice(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {qty > 0 && (
                        <button onClick={() => removeItem(item.id)}
                          className="h-7 w-7 rounded-full border-2 flex items-center justify-center font-bold text-[16px]"
                          style={{ borderColor: RED, color: RED }}>−</button>
                      )}
                      <button onClick={() => addItem(item.id)}
                        className="h-7 w-7 rounded-full flex items-center justify-center font-bold text-[16px] text-white"
                        style={{ background: qty > 0 ? RED : (dark ? '#2A2A2A' : '#EFEFEF'), color: qty > 0 ? 'white' : muted }}>+</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Booking Details */}
        <div className="mx-5 mt-4 rounded-[18px] p-4" style={{ background: surface, border: `1px solid ${border}` }}>
          <p className="text-[15px] font-black mb-3" style={{ color: ink }}>Booking Details</p>

          {/* Date + Time row */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, label: 'Date', value: displayDate },
              { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, label: 'Time', value: displayTime },
            ].map(row => (
              <div key={row.label}>
                <div className="flex items-center gap-1.5 mb-1">
                  {row.icon}
                  <span className="text-[11px] font-semibold" style={{ color: muted }}>{row.label}</span>
                </div>
                <p className="text-[12px] font-bold leading-snug" style={{ color: ink }}>{row.value}</p>
              </div>
            ))}
          </div>

          {/* Guests row with stepper */}
          <div className="flex items-center justify-between rounded-[12px] px-3 py-2.5 mb-3"
            style={{ background: dark ? '#1A1A1A' : '#F8F8F8', border: `1px solid ${border}` }}>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              <span className="text-[12px] font-semibold" style={{ color: muted }}>Guests</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setGuests(g => Math.max(1, g - 1))}
                className="h-7 w-7 rounded-full border-2 flex items-center justify-center text-[16px] font-bold"
                style={{ borderColor: guests > 1 ? RED : border, color: guests > 1 ? RED : muted }}>
                −
              </button>
              <span className="text-[15px] font-black w-5 text-center" style={{ color: ink }}>{guests}</span>
              <button
                onClick={() => setGuests(g => Math.min(20, g + 1))}
                className="h-7 w-7 rounded-full border-2 flex items-center justify-center text-[16px] font-bold"
                style={{ borderColor: RED, color: RED }}>
                +
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => setCalOpen(true)} className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: RED }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit date & time
            </button>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="mx-5 mt-4 rounded-[18px] p-4" style={{ background: surface, border: `1px solid ${border}` }}>
          <p className="text-[15px] font-black mb-3" style={{ color: ink }}>Price Breakdown</p>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[13px]">
              <span style={{ color: muted }}>Package / Reservation</span>
              <span style={{ color: ink }}>{formatPrice(v.basePrice)}</span>
            </div>
            {v.discount > 0 && (
              <div className="flex justify-between text-[13px]">
                <span style={{ color: muted }}>Discount</span>
                <span style={{ color: '#22c55e' }}>−{formatPrice(v.discount)}</span>
              </div>
            )}
            {basketTotal > 0 && (
              <div className="flex justify-between text-[13px]">
                <span style={{ color: muted }}>Menu add-ons</span>
                <span style={{ color: ink }}>{formatPrice(basketTotal)}</span>
              </div>
            )}
            {tState === 'confirmed' && (
              <div className="flex justify-between text-[13px]">
                <span style={{ color: muted }}>Transportation ({selectedCar.label})</span>
                <span style={{ color: ink }}>{formatPrice(selectedCar.price)}</span>
              </div>
            )}
            <div className="border-t border-dashed mt-1 pt-2 flex justify-between text-[15px] font-black" style={{ borderColor: border }}>
              <span style={{ color: ink }}>Total</span>
              <span style={{ color: RED }}>{formatPrice(total)}</span>
            </div>
          </div>
        </div>

        {/* ── TRANSPORTATION ─────────────────────────────────────── */}

        {/* Prompt banner */}
        {tState === 'prompt' && (
          <div className="mx-5 mt-4 overflow-hidden rounded-[20px] relative" style={{ minHeight: 148 }}>
            <img src="/reference/697b2ab879c11684.jpg"
              alt="Transport" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'rgba(5,15,35,0.82)' }} />
            <div className="relative p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ background: RED }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                </div>
                <span className="text-[12px] font-bold text-white/70 uppercase tracking-wider">Add-on</span>
              </div>
              <p className="text-[16px] font-black text-white leading-snug mb-1">Need a ride to the venue?</p>
              <p className="text-[12px] text-white/60 mb-4">Book your transport now — from ₦6,500 round trip</p>
              <div className="flex gap-3">
                <button onClick={() => setTState('declined')}
                  className="flex-1 rounded-full py-2.5 text-[13px] font-bold text-white/80 border border-white/30">
                  No Thanks
                </button>
                <button onClick={() => setTState('configuring')}
                  className="flex-1 rounded-full py-2.5 text-[13px] font-black text-white"
                  style={{ background: RED }}>
                  Yes, Book a Ride
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Declined — compact re-add pill */}
        {tState === 'declined' && (
          <div className="mx-5 mt-4 flex items-center justify-between rounded-[16px] px-4 py-3"
            style={{ background: surface, border: `1px solid ${border}` }}>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-[10px] flex items-center justify-center" style={{ background: dark ? '#1A1A1A' : '#F5F5F5' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              </div>
              <div>
                <p className="text-[13px] font-bold" style={{ color: ink }}>Changed your mind?</p>
                <p className="text-[11px]" style={{ color: muted }}>Add transport — from ₦6,500</p>
              </div>
            </div>
            <button onClick={() => setTState('configuring')}
              className="rounded-full px-4 py-2 text-[12px] font-black text-white"
              style={{ background: RED }}>
              Add
            </button>
          </div>
        )}

        {/* Configuration panel */}
        {tState === 'configuring' && (
          <div className="mx-5 mt-4 rounded-[20px] overflow-hidden" style={{ background: surface, border: `1px solid ${border}` }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${border}` }}>
              <p className="text-[15px] font-black" style={{ color: ink }}>Book Your Ride</p>
              <button onClick={() => setTState('declined')}
                className="h-8 w-8 rounded-full flex items-center justify-center"
                style={{ background: dark ? '#1A1A1A' : '#F5F5F5' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Provider toggle */}
            <div className="px-4 pt-4 pb-3">
              <p className="text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: muted }}>Provider</p>
              <div className="flex gap-2">
                {(['uber', 'bolt'] as const).map(p => (
                  <button key={p} onClick={() => setTProvider(p)}
                    className="flex-1 rounded-[12px] py-2.5 text-[13px] font-black capitalize"
                    style={{
                      background: tProvider === p ? RED : dark ? '#1A1A1A' : '#F5F5F5',
                      color: tProvider === p ? '#fff' : ink,
                      border: `2px solid ${tProvider === p ? RED : border}`,
                    }}>
                    {p === 'uber' ? '⚫ Uber' : '🟢 Bolt'}
                  </button>
                ))}
              </div>
            </div>

            {/* Pickup address */}
            <div className="px-4 pb-3">
              <p className="text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: muted }}>Pickup Address</p>
              {/* Saved / New toggle */}
              <div className="flex gap-1 rounded-[10px] p-1 mb-3" style={{ background: dark ? '#141414' : '#F0F0F0' }}>
                {(['saved', 'new'] as const).map(mode => {
                  const active = tAddrMode === mode
                  return (
                    <button key={mode} onClick={() => setTAddrMode(mode)}
                      className="flex-1 rounded-[8px] py-1.5 text-[12px] font-black"
                      style={{
                        background: active ? surface : 'transparent',
                        color: active ? RED : muted,
                        boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      }}>
                      {mode === 'saved' ? 'Saved Address' : 'New Address'}
                    </button>
                  )
                })}
              </div>
              {tAddrMode === 'saved' ? (
                <div className="flex items-center gap-2 rounded-[12px] px-3 py-2.5"
                  style={{ background: dark ? '#141414' : '#F8F8F8', border: `1px solid ${border}` }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <p className="text-[12px] font-semibold flex-1" style={{ color: ink }}>{SAVED_ADDR}</p>
                  <button onClick={() => setTAddrMode('new')} className="text-[11px] font-bold shrink-0" style={{ color: RED }}>Change</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-[12px] px-3 py-2.5"
                  style={{ background: dark ? '#141414' : '#F8F8F8', border: `1.5px solid ${tNewAddr ? RED : border}` }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={tNewAddr ? RED : muted} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <input value={tNewAddr} onChange={e => setTNewAddr(e.target.value)}
                    placeholder="Enter pickup address"
                    autoFocus
                    className="flex-1 text-[12px] font-semibold outline-none bg-transparent"
                    style={{ color: ink }} />
                  {tNewAddr && <button onClick={() => setTNewAddr('')}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
                </div>
              )}
              {/* Route preview with map */}
              <div className="mt-2 rounded-[12px] overflow-hidden relative" style={{ height: 96, border: `1px solid ${border}` }}>
                <DummyMap dark={dark} height={96} />
                <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.42)' }} />
                <div className="relative px-3 py-2.5 flex gap-3 items-stretch">
                  <div className="flex flex-col items-center pt-1 shrink-0">
                    <div className="h-2.5 w-2.5 rounded-full shadow" style={{ background: RED }} />
                    <div style={{ flex: 1, minHeight: 18, borderLeft: '1.5px dashed rgba(255,255,255,0.5)' }} />
                    <div className="h-2.5 w-2.5 rounded-full border-2 border-white" style={{ background: 'rgba(255,255,255,0.2)' }} />
                  </div>
                  <div className="flex-1 flex flex-col justify-between gap-2">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 mb-0.5">Pickup</p>
                      <p className="text-[11px] font-semibold text-white truncate">{tPickup || 'Pickup address'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 mb-0.5">Destination</p>
                      <p className="text-[11px] font-semibold text-white truncate">{v.name}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Car type */}
            <div className="px-4 pb-4">
              <p className="text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: muted }}>Car Type</p>
              <div className="flex flex-col gap-2">
                {CAR_TYPES.map(car => {
                  const active = tCar === car.id
                  return (
                    <button key={car.id} onClick={() => setTCar(car.id)}
                      className="rounded-[14px] overflow-hidden text-left"
                      style={{ border: `2px solid ${active ? RED : border}` }}>
                      {/* Vehicle illustration */}
                      <div className="relative h-[88px] flex items-center justify-center"
                        style={{ background: active ? (dark ? '#1A0808' : '#FFF5F5') : (dark ? '#161618' : '#F4F4F6') }}>
                        <VehicleIllustration type={car.vehicle} width={210} height={80} />
                        {active && (
                          <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full flex items-center justify-center" style={{ background: RED }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex items-center justify-between px-3 py-2"
                        style={{ background: active ? (dark ? '#1A0808' : '#FFF5F5') : (dark ? '#141414' : '#F8F8F8') }}>
                        <div>
                          <p className="text-[13px] font-black" style={{ color: active ? RED : ink }}>{car.label}</p>
                          <p className="text-[10px]" style={{ color: muted }}>{car.sub} · {car.eta}</p>
                        </div>
                        <p className="text-[13px] font-black" style={{ color: active ? RED : ink }}>{formatPrice(car.price)}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              <button onClick={() => setTState('confirmed')}
                className="w-full mt-4 rounded-full py-3.5 text-[14px] font-black text-white"
                style={{ background: RED }}>
                Confirm — {formatPrice(selectedCar.price)} round trip
              </button>
            </div>
          </div>
        )}

        {/* Confirmed summary */}
        {tState === 'confirmed' && (
          <div className="mx-5 mt-4 rounded-[18px] px-4 py-3.5"
            style={{ background: lightRed, border: `1px solid ${lightRedBorder}` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-[10px] flex items-center justify-center" style={{ background: RED }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                </div>
                <div>
                  <p className="text-[13px] font-black" style={{ color: ink }}>
                    {tProvider === 'uber' ? 'Uber' : 'Bolt'} · {selectedCar.label} ✓
                  </p>
                  <p className="text-[11px]" style={{ color: muted }}>
                    Round trip · {tPickup} → {v.name} · {formatPrice(selectedCar.price)}
                  </p>
                </div>
              </div>
              <button onClick={() => setTState('configuring')}
                className="text-[12px] font-bold shrink-0 ml-2" style={{ color: RED }}>
                Edit
              </button>
            </div>
          </div>
        )}

        {/* Payment */}
        <div className="mx-5 mt-4 rounded-[20px] overflow-hidden" style={{ background: surface, border: `1px solid ${border}` }}>
          <p className="text-[15px] font-black px-5 pt-5 pb-4" style={{ color: ink }}>Payment Method</p>

          {/* ── Saved cards ── */}
          <div className="px-5 pb-4 flex flex-col gap-3">
            {SAVED_CARDS.map(card => {
              const active = payMethod === card.id
              return (
                <button key={card.id} onClick={() => setPayMethod(card.id)}
                  className="rounded-[16px] overflow-hidden text-left w-full transition-all"
                  style={{ border: `2px solid ${active ? RED : border}`, boxShadow: active ? `0 0 0 3px ${RED}22` : 'none' }}>
                  {/* Card graphic */}
                  <div className="px-5 py-4 relative" style={{ background: `linear-gradient(135deg, ${card.color[0]}, ${card.color[1]})`, minHeight: 100 }}>
                    {/* Card type */}
                    <div className="flex justify-between items-start mb-5">
                      {card.type === 'visa' ? (
                        <svg width="44" height="15" viewBox="0 0 44 15" fill="none">
                          <path d="M17.6 14.8H14.2L16.4 0.2H19.8L17.6 14.8ZM11.6 0.2L8.4 10.1L8.0 8.1L6.8 1.3C6.6 0.5 6.0 0.2 5.2 0.2H0.1L0 0.5C1.3 0.8 2.5 1.3 3.5 2.0L6.4 14.8H9.9L15.3 0.2H11.6ZM40.0 14.8H43.1L40.4 0.2H37.6C36.9 0.2 36.3 0.6 36.0 1.2L31.0 14.8H34.5L35.2 12.8H39.5L40.0 14.8ZM36.2 10.3L37.9 5.5L38.9 10.3H36.2ZM29.2 3.9L29.7 0.7C29.1 0.4 28.2 0 27.1 0C23.7 0 21.3 1.8 21.3 4.3C21.3 6.3 23.1 7.3 24.5 7.9C25.9 8.5 26.4 8.9 26.4 9.5C26.4 10.4 25.3 10.8 24.3 10.8C22.9 10.8 22.2 10.6 21.0 10.1L20.5 13.4C21.3 13.8 22.7 14.2 24.2 14.2C27.8 14.2 30.1 12.5 30.1 9.8C30.1 6.5 25.5 6.3 25.5 5.0C25.5 4.1 26.4 3.7 27.8 3.7C28.8 3.7 29.5 3.8 30.0 4.0L29.2 3.9Z" fill="white"/>
                        </svg>
                      ) : (
                        <div className="flex">
                          <div className="h-8 w-8 rounded-full opacity-90" style={{ background: '#EB001B' }} />
                          <div className="h-8 w-8 rounded-full -ml-4 opacity-90" style={{ background: '#F79E1B' }} />
                        </div>
                      )}
                      {/* Chip */}
                      <div className="h-6 w-8 rounded-[4px] opacity-80"
                        style={{ background: 'linear-gradient(135deg, #D4AF37, #F5D896, #D4AF37)' }} />
                    </div>
                    <p className="text-white/90 text-[13px] font-bold tracking-[3px] mb-3">
                      •••• •••• •••• {card.last4}
                    </p>
                    <div className="flex justify-between">
                      <div>
                        <p className="text-white/50 text-[9px] uppercase tracking-wider">Card Holder</p>
                        <p className="text-white text-[12px] font-bold">{card.holder}</p>
                      </div>
                      <div>
                        <p className="text-white/50 text-[9px] uppercase tracking-wider">Expires</p>
                        <p className="text-white text-[12px] font-bold">{card.expiry}</p>
                      </div>
                      {active && (
                        <div className="h-6 w-6 rounded-full flex items-center justify-center self-end"
                          style={{ background: RED }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}

            {/* ── New card ── */}
            <button onClick={() => setPayMethod('newcard')}
              className="rounded-[16px] px-4 py-3.5 flex items-center gap-3 w-full transition-all"
              style={{
                border: `2px dashed ${payMethod === 'newcard' ? RED : border}`,
                background: payMethod === 'newcard' ? (dark ? '#1A0808' : '#FFF5F5') : 'transparent',
              }}>
              <div className="h-9 w-9 rounded-[10px] flex items-center justify-center shrink-0"
                style={{ background: dark ? '#252525' : '#F5F5F5', border: `1px solid ${border}` }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={payMethod === 'newcard' ? RED : muted} strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="text-[13px] font-black" style={{ color: payMethod === 'newcard' ? RED : ink }}>Add a new card</p>
                <p className="text-[11px]" style={{ color: muted }}>Visa, Mastercard, Verve</p>
              </div>
            </button>

            {/* New card form */}
            {payMethod === 'newcard' && (
              <div className="flex flex-col gap-2.5 pt-1">
                <input value={cardNumber} onChange={e => setCardNumber(e.target.value)}
                  placeholder="Card Number"
                  className="w-full rounded-[12px] px-4 py-3 text-[14px] outline-none border tracking-widest"
                  style={{ background: inputBg, borderColor: border, color: ink }} />
                <div className="grid grid-cols-2 gap-2.5">
                  <input value={expiry} onChange={e => setExpiry(e.target.value)}
                    placeholder="MM / YY" maxLength={5}
                    className="rounded-[12px] px-4 py-3 text-[14px] outline-none border"
                    style={{ background: inputBg, borderColor: border, color: ink }} />
                  <input value={cvc} onChange={e => setCvc(e.target.value)}
                    placeholder="CVV" maxLength={3}
                    className="rounded-[12px] px-4 py-3 text-[14px] outline-none border"
                    style={{ background: inputBg, borderColor: border, color: ink }} />
                </div>
                <input value={cardName} onChange={e => setCardName(e.target.value)}
                  placeholder="Name on card"
                  className="w-full rounded-[12px] px-4 py-3 text-[14px] outline-none border"
                  style={{ background: inputBg, borderColor: border, color: ink }} />
              </div>
            )}
          </div>

          {/* ── Divider ── */}
          <div className="mx-5 flex items-center gap-3 pb-4">
            <div className="flex-1 h-px" style={{ background: border }} />
            <span className="text-[11px] font-semibold" style={{ color: muted }}>or pay with</span>
            <div className="flex-1 h-px" style={{ background: border }} />
          </div>

          {/* ── Other methods ── */}
          <div className="px-5 pb-5 flex flex-col gap-2.5">
            {/* Bank Transfer */}
            <button onClick={() => setPayMethod('transfer')}
              className="rounded-[14px] px-4 py-3.5 flex items-center gap-3 w-full text-left transition-all"
              style={{
                background: payMethod === 'transfer' ? (dark ? '#1A0808' : '#FFF5F5') : (dark ? '#141414' : '#F8F8F8'),
                border: `1.5px solid ${payMethod === 'transfer' ? RED : border}`,
              }}>
              <div className="h-9 w-9 rounded-[10px] flex items-center justify-center shrink-0"
                style={{ background: payMethod === 'transfer' ? RED : (dark ? '#252525' : '#EAEAEA') }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={payMethod === 'transfer' ? 'white' : muted} strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2"/>
                  <line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-black" style={{ color: payMethod === 'transfer' ? RED : ink }}>Bank Transfer</p>
                <p className="text-[11px]" style={{ color: muted }}>Pay directly to fajify account</p>
              </div>
              {payMethod === 'transfer' && (
                <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{ background: RED }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
            </button>

            {/* Bank transfer details */}
            {payMethod === 'transfer' && (
              <div className="rounded-[14px] p-4 flex flex-col gap-2.5"
                style={{ background: dark ? '#0F0F0F' : '#F8F8F8', border: `1px solid ${border}` }}>
                <p className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: muted }}>Transfer Details</p>
                {[
                  { label: 'Bank', val: 'Sterling Bank' },
                  { label: 'Account Name', val: 'fajify Payments Ltd' },
                  { label: 'Account Number', val: '0123456789' },
                  { label: 'Reference', val: `FJ-${venueId.toUpperCase()}-${Date.now().toString().slice(-6)}` },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center py-1.5"
                    style={{ borderBottom: `1px solid ${border}` }}>
                    <p className="text-[11px]" style={{ color: muted }}>{row.label}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] font-bold" style={{ color: ink }}>{row.val}</p>
                      {(row.label === 'Account Number' || row.label === 'Reference') && (
                        <button onClick={() => { navigator.clipboard?.writeText(row.val); setCopiedRef(true); setTimeout(() => setCopiedRef(false), 2000) }}
                          className="text-[10px] font-black rounded-full px-2 py-0.5"
                          style={{ background: RED + '18', color: RED }}>
                          {copiedRef && row.label === 'Reference' ? 'Copied!' : 'Copy'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <p className="text-[10px] mt-1" style={{ color: muted }}>
                  ⚠️ Include the reference when transferring. Booking activates within 5 minutes of payment.
                </p>
              </div>
            )}

            {/* USSD */}
            <button onClick={() => setPayMethod('ussd')}
              className="rounded-[14px] px-4 py-3.5 flex items-center gap-3 w-full text-left transition-all"
              style={{
                background: payMethod === 'ussd' ? (dark ? '#1A0808' : '#FFF5F5') : (dark ? '#141414' : '#F8F8F8'),
                border: `1.5px solid ${payMethod === 'ussd' ? RED : border}`,
              }}>
              <div className="h-9 w-9 rounded-[10px] flex items-center justify-center shrink-0"
                style={{ background: payMethod === 'ussd' ? RED : (dark ? '#252525' : '#EAEAEA') }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke={payMethod === 'ussd' ? 'white' : muted} strokeWidth="2">
                  <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18" strokeLinecap="round" strokeWidth="3"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-black" style={{ color: payMethod === 'ussd' ? RED : ink }}>USSD</p>
                <p className="text-[11px]" style={{ color: muted }}>Dial from any phone, no internet needed</p>
              </div>
              {payMethod === 'ussd' && (
                <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{ background: RED }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
            </button>

            {payMethod === 'ussd' && (
              <div className="rounded-[14px] p-4" style={{ background: dark ? '#0F0F0F' : '#F8F8F8', border: `1px solid ${border}` }}>
                <p className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: muted }}>Dial your bank code</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { bank: 'GTBank',    code: '*737*58*Amount#' },
                    { bank: 'Zenith',    code: '*966*Amount#' },
                    { bank: 'First Bank',code: '*894*Amount#' },
                    { bank: 'UBA',       code: '*919*Amount#' },
                    { bank: 'Access',    code: '*901*58*Amount#' },
                    { bank: 'Stanbic',   code: '*909*Amount#' },
                  ].map(({ bank, code }) => (
                    <div key={bank} className="rounded-[10px] px-3 py-2.5"
                      style={{ background: dark ? '#1A1A1A' : '#FFF', border: `1px solid ${border}` }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: muted }}>{bank}</p>
                      <p className="text-[11px] font-black" style={{ color: RED }}>{code}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Book CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 pb-8 pt-4"
        style={{ background: surface, borderTop: `1px solid ${border}` }}>
        {!payMethod && (
          <p className="text-center text-[11px] font-semibold mb-2" style={{ color: muted }}>
            Select a payment method above to continue
          </p>
        )}
        <button
          disabled={!payMethod}
          onClick={() => {
            const bookingRef = `FJ-BOOK-${venueId.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
            setBookingReference(bookingRef)
            addBooking({
              id: bookingRef,
              venueId,
              name: v.name,
              venue: v.location,
              date: `${displayDate} · ${displayTime}`,
              image: v.image,
              price: `₦${total.toLocaleString('en-NG')}`,
              status: 'Upcoming',
              type: 'booking',
              hasTransport: tState === 'confirmed',
              transportType: tState === 'confirmed' ? tCar : undefined,
              location: { name: v.name, address: v.location },
              qrValue: `FAJI:BOOKING:${venueId}:${displayDate}:${displayTime}:${guests}guests`,
              ref: bookingRef,
              guests,
            })
            setShowSuccessOverlay(true)
          }}
          className="w-full flex items-center justify-between rounded-[16px] px-6 py-4 text-white transition-opacity"
          style={{ background: payMethod ? RED : (dark ? '#333' : '#CCC'), opacity: payMethod ? 1 : 0.6, cursor: payMethod ? 'pointer' : 'not-allowed' }}>
          <div className="flex items-center gap-2">
            {!payMethod && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            )}
            <span className="text-[16px] font-black">Book Reservation</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[16px] font-black">{formatPrice(total)}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/><path d="M15 18l6-6-6-6" opacity="0.5"/></svg>
          </div>
        </button>
      </div>
    </div>
    <CalendarSheet
      open={calOpen}
      onClose={() => setCalOpen(false)}
      onConfirm={(date, time) => { setSelectedDate(date); setSelectedTime(time); setCalOpen(false) }}
      venueTimeType={VENUE_TIME_MAP[venueId] ?? 'default'}
      venueName={v.name}
    />

    {showSuccessOverlay && (
      <SuccessOverlay
        title="Booking Confirmed!"
        subtitle={`Your table at ${v.name} is booked`}
        onDone={() => { setShowSuccessOverlay(false); setPaid(true); setShowSuccessToast(true); setTimeout(() => setShowSuccessToast(false), 3500) }}
      />
    )}

    {showSuccessToast && (
      <div style={{ position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%)', zIndex: 60, background: '#22c55e', borderRadius: 20, padding: '14px 24px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', gap: 10, maxWidth: 380, width: '90%' }}>
        <span style={{ fontSize: 22 }}>🎉</span>
        <div>
          <p style={{ color: 'white', fontWeight: 800, fontSize: 14, margin: 0 }}>Booking Confirmed!</p>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, margin: 0 }}>Your ticket has been added to My Tickets</p>
        </div>
      </div>
    )}

    {paid && (
      <QRTicket
        type="booking"
        title={v.name}
        subtitle={v.location}
        detail1={`${guests} Guest${guests > 1 ? 's' : ''} · ${v.location}`}
        detail2={`${displayDate} · ${displayTime}`}
        reference={bookingReference}
        qrValue={`FAJI:BOOKING:${venueId}:${displayDate}:${displayTime}:${guests}guests`}
        accent={RED}
        dark={dark}
        transportAdded={tState === 'confirmed'}
        transportCta={() => setShowTicketTransport(true)}
        onClose={() => {
          setPaid(false)
          navigate({ name: 'myTickets' })
        }}
      />
    )}

    {/* Transport picker sheet — slides up over the QR ticket */}
    {paid && showTicketTransport && (
      <div className="fixed inset-0 z-[80] flex flex-col justify-end max-w-[430px] mx-auto"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={() => setShowTicketTransport(false)}>
        <div className="rounded-t-[28px] p-6" style={{ background: dark ? '#1C1C1C' : '#fff' }}
          onClick={e => e.stopPropagation()}>
          <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: dark ? '#444' : '#E0E0E0' }} />
          <p className="text-[17px] font-black mb-1" style={{ color: dark ? '#F0F0F0' : '#1A1A1A' }}>Add Transport</p>
          <p className="text-[12px] mb-5" style={{ color: dark ? '#888' : '#888' }}>Pick a ride to get you to {v.name}</p>
          <div className="flex flex-col gap-3 mb-5">
            {CAR_TYPES.map(car => (
              <button key={car.id} onClick={() => setTCar(car.id)}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all"
                style={{ border: `2px solid ${tCar === car.id ? RED : (dark ? '#2A2A2A' : '#E8E8E8')}`, background: tCar === car.id ? (dark ? '#2A1010' : '#FFF5F5') : 'transparent' }}>
                <div style={{ width: 56, height: 40, flexShrink: 0 }}><VehicleIllustration type={car.vehicle} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-black" style={{ color: dark ? '#F0F0F0' : '#1A1A1A' }}>{car.label}</p>
                  <p className="text-[11px]" style={{ color: dark ? '#888' : '#888' }}>{car.sub}</p>
                </div>
                <p className="text-[14px] font-black shrink-0" style={{ color: RED }}>₦{car.price.toLocaleString('en-NG')}</p>
              </button>
            ))}
          </div>
          <button
            onClick={() => { setTState('confirmed'); setShowTicketTransport(false) }}
            className="w-full rounded-2xl py-4 text-[15px] font-black text-white"
            style={{ background: RED }}>
            Confirm — ₦{CAR_TYPES.find(c => c.id === tCar)!.price.toLocaleString('en-NG')}
          </button>
        </div>
      </div>
    )}
    </>
  )
}
