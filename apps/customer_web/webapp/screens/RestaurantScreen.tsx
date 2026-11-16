import { useState, useEffect, useRef } from 'react'
import type { NavigateFn } from '../App'
import { useDarkMode } from '../store/darkMode'
import { useSaved } from '../store/saved'
import { useCart } from '../store/cart'
import CalendarSheet, { type VenueTimeType } from '../components/CalendarSheet'

type Props = { id: string; navigate: NavigateFn; liveVenue?: VenueConfig; onBook?: (id:string)=>void; onSaveOffering?: (id:string)=>void }

const RED = '#FA3F38'

type Offering = {
  id: string
  name: string
  desc: string
  tag: string
  tagColor: string
  price: number
  rating: number | string
  reviews: string
  image: string
  category: string
}

export type VenueConfig = {
  id: string
  name: string
  subtitle: string
  location: string
  heroImage: string
  avatarImage: string
  verified: boolean
  openHours: string
  rating: number | string
  reviewCount: string
  stat2Label: string
  stat2Value: string
  stat3Label: string
  stat3Value: string
  ctaLabel: string
  promoTitle: string
  promoDesc: string
  categories: string[]
  offerings: Offering[]
  orderable?: boolean
  galleryImages?: string[]
}

function formatPrice(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

const VENUES: Record<string, VenueConfig> = {
  v1: {
    id: 'v1', name: 'Shiro Lagos', subtitle: 'Shiro Restaurant (Victoria Island)',
    location: 'Victoria Island, Lagos',
    heroImage: '/reference/d95cc6de0440bfd2.jpg',
    avatarImage: '/reference/4e9de3224bdd50d4.jpg',
    galleryImages: [
      '/reference/69f04e03f7f54ebb.jpg',
      '/reference/737f6267adfbd852.jpg',
      '/reference/ef9acdd5f575123a.jpg',
      '/reference/bc31264e1f162dbe.jpg',
      '/reference/7d8d2bf4affdf4aa.jpg',
    ],
    verified: true, openHours: 'Open till 09:00 pm',
    rating: 4.8, reviewCount: '2.4k',
    stat2Label: 'Reserve time', stat2Value: '30-45min',
    stat3Label: 'Min. spend', stat3Value: '₦25k',
    ctaLabel: 'Book a Reservation', orderable: true,
    promoTitle: 'Date Night Special', promoDesc: 'Dinner for 2 with complimentary wine. Book now.',
    categories: ['All', 'Starters', 'Mains', 'Grills', 'Desserts', 'Drinks'],
    offerings: [
      { id: 'v1o1', name: 'WAGYU BEEF TENDERLOIN', desc: 'Premium cut, perfectly seared', tag: 'Chef\'s Special', tagColor: '#8B5CF6', price: 35000, rating: 4.9, reviews: '1.2k', image: '/reference/b5461d6b560c7688.jpg', category: 'Mains' },
      { id: 'v1o2', name: 'GRILLED LOBSTER', desc: 'Fresh Atlantic lobster, garlic butter', tag: 'Best seller', tagColor: RED, price: 45000, rating: 4.8, reviews: '890', image: '/reference/5d0b3388c9911564.jpg', category: 'Grills' },
      { id: 'v1o3', name: 'TRUFFLE PASTA', desc: 'House-made tagliatelle, black truffle', tag: 'Popular', tagColor: '#F97316', price: 28000, rating: 4.7, reviews: '1.5k', image: '/reference/6f36a2d3cca5ab8a.jpg', category: 'Mains' },
      { id: 'v1o4', name: 'TUNA TARTARE', desc: 'Sashimi grade tuna, avocado', tag: 'Great starter', tagColor: '#22c55e', price: 18000, rating: 4.6, reviews: '650', image: '/reference/preview-tuna.svg', category: 'Starters' },
      { id: 'v1o5', name: 'CHOCOLATE FONDANT', desc: 'Warm dark chocolate, vanilla ice cream', tag: 'Must try', tagColor: '#8B5CF6', price: 12000, rating: 4.9, reviews: '2.1k', image: '/reference/e4493dfe9ad1fc07.jpg', category: 'Desserts' },
      { id: 'v1o6', name: 'CRAFTED COCKTAILS', desc: 'Signature house cocktails', tag: 'Popular', tagColor: RED, price: 8500, rating: 4.7, reviews: '980', image: '/reference/312e3a2db7489bca.jpg', category: 'Drinks' },
    ],
  },
  v2: {
    id: 'v2', name: 'Landmark Beach', subtitle: 'Landmark Beach (Lekki)',
    location: 'Lekki Waterfront, Lagos',
    heroImage: '/reference/a5867c62d81b3f4b.jpg',
    avatarImage: '/reference/33f1e87d8de3693a.jpg',
    verified: true, openHours: 'Open till 08:00 pm',
    rating: 4.7, reviewCount: '1.8k',
    stat2Label: 'Entry from', stat2Value: '₦5,000',
    stat3Label: 'Activities', stat3Value: '12+',
    ctaLabel: 'Book Beach Access',
    promoTitle: 'Weekend Package', promoDesc: 'All-day beach access + lunch included. Save 20%.',
    categories: ['All', 'Access', 'Activities', 'Food', 'Drinks', 'Packages'],
    offerings: [
      { id: 'v2o1', name: 'FULL DAY BEACH ACCESS', desc: 'Unlimited beach + lounger + umbrella', tag: 'Best value', tagColor: '#22c55e', price: 5000, rating: 4.8, reviews: '3.2k', image: '/reference/bcfd9369b564c4e2.jpg', category: 'Access' },
      { id: 'v2o2', name: 'JET SKI RIDE (30MIN)', desc: 'Guided open-sea jet ski experience', tag: 'Adrenaline rush', tagColor: RED, price: 25000, rating: 4.7, reviews: '820', image: '/reference/dde304cd8995c8b0.jpg', category: 'Activities' },
      { id: 'v2o3', name: 'BEACH VOLLEYBALL', desc: 'Court rental + equipment', tag: 'Group fun', tagColor: '#F97316', price: 8000, rating: 4.6, reviews: '540', image: '/reference/762d98becaaeec60.jpg', category: 'Activities' },
      { id: 'v2o4', name: 'SEAFOOD PLATTER', desc: 'Fresh catch of the day, grilled', tag: 'Fresh daily', tagColor: '#22c55e', price: 18000, rating: 4.9, reviews: '1.1k', image: '/reference/38c3f072fb2d5ef0.jpg', category: 'Food' },
      { id: 'v2o5', name: 'COUPLES PACKAGE', desc: 'Access + lunch + 1hr boat ride', tag: 'Most popular', tagColor: RED, price: 45000, rating: 4.9, reviews: '760', image: '/reference/a06619c8bee65e40.jpg', category: 'Packages' },
      { id: 'v2o6', name: 'COCKTAILS & MOCKTAILS', desc: 'Tropical beachside drinks', tag: 'Refreshing', tagColor: '#8B5CF6', price: 4500, rating: 4.5, reviews: '980', image: '/reference/2ee7a9fef86b4ee9.jpg', category: 'Drinks' },
    ],
  },
  v3: {
    id: 'v3', name: 'Filmhouse Cinemas', subtitle: 'Filmhouse Cinemas (Lekki Phase 1)',
    location: 'Lekki Phase 1, Lagos',
    heroImage: '/reference/02beb290abfb2d68.jpg',
    avatarImage: '/reference/6e25c6f5a760a545.jpg',
    verified: true, openHours: 'Open till 11:00 pm',
    rating: 4.6, reviewCount: '5.1k',
    stat2Label: 'Showtime', stat2Value: 'Every 2hrs',
    stat3Label: 'Ticket from', stat3Value: '₦3,500',
    ctaLabel: 'Book Seats',
    promoTitle: 'Tuesday Deal', promoDesc: 'Buy 2 tickets get 1 free every Tuesday.',
    categories: ['All', 'Now Showing', 'Coming Soon', 'IMAX', 'Snacks', 'Drinks'],
    offerings: [
      { id: 'v3o1', name: 'MOANA 2', desc: '2hr 20min · Animation · PG', tag: 'Now showing', tagColor: '#22c55e', price: 6000, rating: 4.8, reviews: '12k', image: '/reference/808e3bd4786277ed.jpg', category: 'Now Showing' },
      { id: 'v3o2', name: 'KARATE KID: LEGENDS', desc: '2hr 5min · Action · PG-13', tag: 'Hot 🔥', tagColor: RED, price: 6000, rating: 4.7, reviews: '8.4k', image: '/reference/0188fdf52048c92a.jpg', category: 'Now Showing' },
      { id: 'v3o3', name: 'IMAX EXPERIENCE', desc: 'Premium large format · Best sound', tag: 'Premium', tagColor: '#8B5CF6', price: 10000, rating: 4.9, reviews: '3.2k', image: '/reference/e9a83e35c0b99286.jpg', category: 'IMAX' },
      { id: 'v3o4', name: 'LARGE POPCORN COMBO', desc: 'Large popcorn + 2 drinks', tag: 'Value deal', tagColor: '#F97316', price: 4500, rating: 4.6, reviews: '7.8k', image: '/reference/dcf6b19cabcdce94.jpg', category: 'Snacks' },
      { id: 'v3o5', name: 'NACHOS & DIP', desc: 'Crispy nachos with cheese dip', tag: 'Popular', tagColor: RED, price: 3000, rating: 4.4, reviews: '4.2k', image: '/reference/0e99c71185fff521.jpg', category: 'Snacks' },
      { id: 'v3o6', name: 'SLUSHIE (LARGE)', desc: 'Strawberry, Blue raspberry or Cola', tag: 'Refreshing', tagColor: '#22c55e', price: 2000, rating: 4.5, reviews: '6.1k', image: '/reference/615e8ffe1911de8b.jpg', category: 'Drinks' },
    ],
  },
  v4: {
    id: 'v4', name: 'Muri Okunola Park', subtitle: 'Muri Okunola Park (V/I)',
    location: 'Victoria Island, Lagos',
    heroImage: '/reference/139fed3756ecc803.jpg',
    avatarImage: '/reference/1740be275b650e7b.jpg',
    verified: true, openHours: 'Open till 07:00 pm',
    rating: 4.5, reviewCount: '890',
    stat2Label: 'Entry', stat2Value: 'Free',
    stat3Label: 'Capacity', stat3Value: '500+',
    ctaLabel: 'Reserve Picnic Spot',
    promoTitle: 'Weekend Events', promoDesc: 'Live music & food vendors every Saturday.',
    categories: ['All', 'Picnic', 'Events', 'Food', 'Kids Zone', 'Sports'],
    offerings: [
      { id: 'v4o1', name: 'PREMIUM PICNIC SPOT', desc: 'Shaded area + table + 4 chairs', tag: 'Most reserved', tagColor: '#22c55e', price: 8000, rating: 4.7, reviews: '340', image: '/reference/a3b3521c037a0aca.jpg', category: 'Picnic' },
      { id: 'v4o2', name: 'KIDS PLAY ZONE ACCESS', desc: 'Full play equipment + supervision', tag: 'Family friendly', tagColor: '#F97316', price: 2000, rating: 4.8, reviews: '520', image: '/reference/63ea5979a58016c3.jpg', category: 'Kids Zone' },
      { id: 'v4o3', name: 'BBQ PACKAGE', desc: 'Grill spot + charcoal + starter kit', tag: 'Weekend special', tagColor: RED, price: 15000, rating: 4.6, reviews: '280', image: '/reference/a267dbd22f90dcd6.jpg', category: 'Food' },
      { id: 'v4o4', name: 'OUTDOOR YOGA CLASS', desc: 'Sat morning · All levels welcome', tag: 'Wellness', tagColor: '#8B5CF6', price: 3500, rating: 4.9, reviews: '190', image: '/reference/22ab49a44f564787.jpg', category: 'Sports' },
    ],
  },
  v5: {
    id: 'v5', name: 'Nok by Alara', subtitle: 'Nok by Alara (Ikoyi)',
    location: 'Ikoyi, Lagos',
    heroImage: '/reference/ce0b9c411c5b00b7.jpg',
    avatarImage: '/reference/1a59fd621f237366.jpg',
    verified: true, openHours: 'Open till 10:00 pm',
    rating: 4.9, reviewCount: '3.1k',
    stat2Label: 'Reserve time', stat2Value: '1-2 days',
    stat3Label: 'Min. spend', stat3Value: '₦30k',
    ctaLabel: 'Book Rooftop Table', orderable: true,
    promoTitle: 'Sunset Dinner Experience', promoDesc: 'Rooftop dining with panoramic Lagos views.',
    categories: ['All', 'Nigerian', 'Continental', 'Grills', 'Cocktails', 'Desserts'],
    offerings: [
      { id: 'v5o1', name: 'SUYA PLATTER', desc: 'Premium beef suya, onions, tomatoes', tag: 'Nigerian classic', tagColor: '#F97316', price: 22000, rating: 4.9, reviews: '2.1k', image: '/reference/073163175eaaf461.jpg', category: 'Nigerian' },
      { id: 'v5o2', name: 'EGUSI SOUP DELUXE', desc: 'Rich egusi with assorted meats', tag: 'Traditional', tagColor: '#22c55e', price: 18000, rating: 4.8, reviews: '1.4k', image: '/reference/c49eaf93aea08b1a.jpg', category: 'Nigerian' },
      { id: 'v5o3', name: 'NOK SIGNATURE COCKTAIL', desc: 'Hibiscus, palm wine, bitters', tag: 'Unique', tagColor: '#8B5CF6', price: 12000, rating: 4.9, reviews: '980', image: '/reference/312e3a2db7489bca.jpg', category: 'Cocktails' },
      { id: 'v5o4', name: 'GRILLED FISH PLATTER', desc: 'Fresh tilapia with pepper sauce', tag: 'Must try', tagColor: RED, price: 25000, rating: 4.8, reviews: '760', image: '/reference/b1c9317c86cf843d.jpg', category: 'Grills' },
    ],
  },
  v6: {
    id: 'v6', name: 'Hard Rock Cafe', subtitle: 'Hard Rock Cafe (Oniru)',
    location: 'Oniru Estate, Lagos',
    heroImage: '/reference/eb68f97cde0f8379.jpg',
    avatarImage: '/reference/f272945e8a21f595.jpg',
    verified: true, openHours: 'Opens at 05:00 pm',
    rating: 4.6, reviewCount: '2.8k',
    stat2Label: 'Table wait', stat2Value: '20-40min',
    stat3Label: 'Min. spend', stat3Value: '₦15k',
    ctaLabel: 'Reserve a Table', orderable: true,
    promoTitle: 'Happy Hour 5–7pm', promoDesc: '2-for-1 cocktails every weekday evening.',
    categories: ['All', 'Burgers', 'Wings', 'Cocktails', 'Sharers', 'Desserts'],
    offerings: [
      { id: 'v6o1', name: 'LEGENDARY BURGER', desc: '300g beef patty, bacon, cheese', tag: 'Signature', tagColor: RED, price: 18000, rating: 4.8, reviews: '3.4k', image: '/reference/926b142259cfbbf4.jpg', category: 'Burgers' },
      { id: 'v6o2', name: 'NASHVILLE HOT WINGS', desc: '12pcs crispy wings, signature sauce', tag: 'Spicy 🔥', tagColor: '#F97316', price: 15000, rating: 4.7, reviews: '2.1k', image: '/reference/256ce37001dcc1c2.jpg', category: 'Wings' },
      { id: 'v6o3', name: 'ROCK NACHOS', desc: 'Giant nachos, jalapeños, guacamole', tag: 'Great sharer', tagColor: '#22c55e', price: 12000, rating: 4.6, reviews: '1.8k', image: '/reference/0e99c71185fff521.jpg', category: 'Sharers' },
      { id: 'v6o4', name: 'SIGNATURE COCKTAILS', desc: 'Hard Rock originals', tag: 'Happy hour', tagColor: '#8B5CF6', price: 9500, rating: 4.5, reviews: '1.2k', image: '/reference/312e3a2db7489bca.jpg', category: 'Cocktails' },
    ],
  },
  v7: {
    id: 'v7', name: 'Silverbird Cinemas', subtitle: 'Silverbird Cinemas (Ikeja)',
    location: 'Ikeja City Mall, Lagos',
    heroImage: '/reference/5aa22915f631a931.jpg',
    avatarImage: '/reference/bc5a37d8f42e7482.jpg',
    verified: true, openHours: 'Open till 11:00 pm',
    rating: 4.5, reviewCount: '7.2k',
    stat2Label: 'Showtime', stat2Value: 'Every 2hrs',
    stat3Label: 'Ticket from', stat3Value: '₦3,000',
    ctaLabel: 'Buy Tickets',
    promoTitle: 'Family Sunday', promoDesc: 'Kids under 12 get in free on Sundays.',
    categories: ['All', 'Now Showing', 'Coming Soon', 'VIP', 'Snacks', 'Drinks'],
    offerings: [
      { id: 'v7o1', name: 'STANDARD TICKET', desc: 'Regular screen · Any available seat', tag: 'Best price', tagColor: '#22c55e', price: 3000, rating: 4.5, reviews: '9.1k', image: '/reference/808e3bd4786277ed.jpg', category: 'Now Showing' },
      { id: 'v7o2', name: 'VIP SOFA SEAT', desc: 'Luxury recliner + in-seat service', tag: 'Premium', tagColor: '#8B5CF6', price: 8000, rating: 4.9, reviews: '2.3k', image: '/reference/2aa51cf9825e8d59.jpg', category: 'VIP' },
      { id: 'v7o3', name: 'COMBO MEAL', desc: 'Medium popcorn + large drink', tag: 'Value', tagColor: '#F97316', price: 3500, rating: 4.4, reviews: '8.4k', image: '/reference/dcf6b19cabcdce94.jpg', category: 'Snacks' },
    ],
  },
  v8: {
    id: 'v8', name: 'Ilashe Beach Resort', subtitle: 'Ilashe Beach Resort (Lagos Island)',
    location: 'Snake Island, Amuwo Odofin Lagos.',
    heroImage: '/reference/a5867c62d81b3f4b.jpg',
    avatarImage: '/reference/ab70e2dcf7d73fe0.jpg',
    verified: true, openHours: 'Open till 09:00 pm',
    rating: 4.9, reviewCount: '1.4k',
    stat2Label: 'Travel time', stat2Value: '45min by boat',
    stat3Label: 'Package from', stat3Value: '₦45k',
    ctaLabel: 'Book Ilashe Package',
    promoTitle: 'Weekend Escape Package', promoDesc: 'All-inclusive: boat + accommodation + meals.',
    categories: ['All', 'Access', 'Accommodation', 'Activities', 'Food', 'Packages'],
    offerings: [
      { id: 'v8o1', name: 'DAY TRIP ACCESS', desc: 'Boat transfer + beach access', tag: 'Most popular', tagColor: '#22c55e', price: 45000, rating: 4.8, reviews: '890', image: '/reference/bcfd9369b564c4e2.jpg', category: 'Access' },
      { id: 'v8o2', name: 'OVERNIGHT CABIN', desc: 'Beachfront cabin for 2', tag: 'Romantic', tagColor: '#8B5CF6', price: 120000, rating: 4.9, reviews: '340', image: '/reference/8fa835796b33acf1.jpg', category: 'Accommodation' },
      { id: 'v8o3', name: 'JET SKI & WATER SPORTS', desc: '2hr unlimited water sports access', tag: 'Adrenaline', tagColor: RED, price: 35000, rating: 4.7, reviews: '520', image: '/reference/dde304cd8995c8b0.jpg', category: 'Activities' },
      { id: 'v8o4', name: 'ALL-INCLUSIVE PACKAGE', desc: 'Boat + beach + buffet + activities', tag: 'Best value', tagColor: '#F97316', price: 100000, rating: 4.9, reviews: '760', image: '/reference/ab70e2dcf7d73fe0.jpg', category: 'Packages' },
    ],
  },
  v9: {
    id: 'v9', name: 'The Island Club', subtitle: 'The Island Club (Ikoyi)',
    location: 'Ikoyi, Lagos',
    heroImage: '/reference/652a5f525ce5233e.jpg',
    avatarImage: '/reference/f0801f0345e2eac1.jpg',
    verified: true, openHours: 'Opens at 09:00 pm',
    rating: 4.8, reviewCount: '1.2k',
    stat2Label: 'Table from', stat2Value: '₦60k',
    stat3Label: 'Dress code', stat3Value: 'Smart casual',
    ctaLabel: 'Reserve Table',
    promoTitle: 'Exclusive Members Night', promoDesc: 'Free entry before 10pm. Book your table now.',
    categories: ['All', 'Tables', 'Bottles', 'Food', 'Events', 'VIP'],
    offerings: [
      { id: 'v9o1', name: 'STANDARD TABLE', desc: 'Seating for 4-6 guests', tag: 'Best entry', tagColor: '#22c55e', price: 60000, rating: 4.7, reviews: '540', image: '/reference/312e3a2db7489bca.jpg', category: 'Tables' },
      { id: 'v9o2', name: 'BOTTLE SERVICE', desc: 'Premium spirits + mixers + ice', tag: 'VIP treatment', tagColor: '#8B5CF6', price: 80000, rating: 4.9, reviews: '380', image: '/reference/7eb74a95fe8b63a4.jpg', category: 'Bottles' },
      { id: 'v9o3', name: 'VIP SECTION', desc: 'Private area for 10+ guests', tag: 'Exclusive', tagColor: RED, price: 200000, rating: 4.9, reviews: '120', image: '/reference/6724ec6bcd168651.jpg', category: 'VIP' },
    ],
  },
  v10: {
    id: 'v10', name: 'Sky Bar Lagos', subtitle: 'Sky Bar Lagos (Victoria Island)',
    location: 'Victoria Island, Lagos',
    heroImage: '/reference/6ad65ccced581aeb.jpg',
    avatarImage: '/reference/947c65e86def36aa.jpg',
    verified: true, openHours: 'Open till 02:00 am',
    rating: 4.7, reviewCount: '2.1k',
    stat2Label: 'Table from', stat2Value: '₦20k',
    stat3Label: 'Views', stat3Value: '360° skyline',
    ctaLabel: 'Book Rooftop Spot', orderable: true,
    promoTitle: 'Sunset Hour 6–8pm', promoDesc: 'Drinks at half price with skyline views.',
    categories: ['All', 'Cocktails', 'Bottles', 'Bites', 'Tables', 'Events'],
    offerings: [
      { id: 'v10o1', name: 'SIGNATURE SKY COCKTAIL', desc: 'House special with skyline view', tag: 'Must try', tagColor: RED, price: 12000, rating: 4.8, reviews: '1.6k', image: '/reference/bf5b06f6b30c44e0.jpg', category: 'Cocktails' },
      { id: 'v10o2', name: 'ROOFTOP TABLE (4 PAX)', desc: 'Outdoor table with panoramic view', tag: 'Popular', tagColor: '#22c55e', price: 20000, rating: 4.7, reviews: '980', image: '/reference/bf7e4e3f5df6acaa.jpg', category: 'Tables' },
      { id: 'v10o3', name: 'PREMIUM BOTTLE', desc: 'Hennessy / Ciroc + mixers', tag: 'VIP', tagColor: '#8B5CF6', price: 75000, rating: 4.9, reviews: '430', image: '/reference/7eb74a95fe8b63a4.jpg', category: 'Bottles' },
      { id: 'v10o4', name: 'TAPAS PLATTER', desc: 'Assorted small bites for sharing', tag: 'Perfect pairing', tagColor: '#F97316', price: 15000, rating: 4.6, reviews: '720', image: '/reference/496ae3beed04f036.jpg', category: 'Bites' },
    ],
  },
}

// Fallback for unknown venue IDs
const DEFAULT_VENUE: VenueConfig = VENUES.v1

const VENUE_TIME_TYPE: Record<string, VenueTimeType> = {
  v1: 'restaurant', v2: 'beach', v3: 'cinema', v4: 'park',
  v5: 'restaurant', v6: 'bar', v7: 'cinema', v8: 'beach',
  v9: 'club', v10: 'bar',
}

export default function RestaurantScreen({ id, navigate, liveVenue, onBook, onSaveOffering }: Props) {
  const { dark } = useDarkMode()
  const [heroIdx, setHeroIdx] = useState(0)
  const heroTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { isSaved, toggle } = useSaved()
  const cart = useCart()
  const [activeCategory, setActiveCategory] = useState('All')
  const [calOpen, setCalOpen] = useState(false)

  const venue = liveVenue ?? VENUES[id] ?? DEFAULT_VENUE
  const gallery = venue.galleryImages?.length ? venue.galleryImages : [venue.heroImage]

  useEffect(() => { window.scrollTo(0, 0) }, [id])

  const galleryRef = useRef(gallery)
  galleryRef.current = gallery

  useEffect(() => { setHeroIdx(0) }, [id])

  useEffect(() => {
    const timer = setInterval(() => {
      if (galleryRef.current.length > 1)
        setHeroIdx(i => (i + 1) % galleryRef.current.length)
    }, 3500)
    return () => clearInterval(timer)
  }, [])

  const bg      = dark ? '#0F0F0F' : '#F8F8F8'
  const surface = dark ? '#1C1C1C' : '#FFFFFF'
  const ink     = dark ? '#F0F0F0' : '#1A1A1A'
  const muted   = dark ? '#888' : '#888888'
  const border  = dark ? '#2A2A2A' : '#EEEEEE'

  const venueSaved = isSaved(venue.id)
  const filtered = activeCategory === 'All' ? venue.offerings : venue.offerings.filter(o => o.category === activeCategory)
  const venueCartItems = cart.venueItems(venue.id)
  const venueCartQty = venueCartItems.reduce((s, i) => s + i.qty, 0)
  const venueCartTotal = venueCartItems.reduce((s, i) => s + i.price * i.qty, 0)

  function formatPrice2(n: number) { return '₦' + n.toLocaleString('en-NG') }

  return (
    <>
    <div className="min-h-screen w-full font-[family-name:var(--font-ui)] md:px-8 md:py-8 md:pl-28" style={{ background: bg }}>
      {/* Hero gallery — auto-advances like home banner */}
      <div className="relative h-[260px] overflow-hidden md:mx-auto md:h-[480px] md:max-w-7xl md:rounded-[30px]">
        {gallery.map((img, i) => (
          <img key={i} src={img} alt={venue.name}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
            style={{ opacity: heroIdx === i ? 1 : 0 }} />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-black/25" />

        {/* Top nav buttons */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-12 md:px-8 md:pt-8">
          <button aria-label="Back to discovery" onClick={() => navigate({ name: 'home' })}
            className="h-10 w-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="flex items-center gap-2">
            <button disabled={!!liveVenue} title={liveVenue?"Save individual experiences from the catalogue":undefined} onClick={() => toggle(venue.id)}
              className="h-10 w-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill={venueSaved ? RED : 'none'} stroke={venueSaved ? RED : 'white'} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            </button>
            <button className="flex items-center gap-1.5 rounded-full px-3 h-10"
              style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              <span className="text-[13px] font-semibold text-white">Share</span>
            </button>
          </div>
        </div>

        {/* Dot indicators */}
        {gallery.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
            {gallery.map((_, i) => (
              <button key={i} onClick={() => {
                setHeroIdx(i)
                if (heroTimerRef.current) clearInterval(heroTimerRef.current)
                heroTimerRef.current = setInterval(() => setHeroIdx(n => (n + 1) % gallery.length), 3500)
              }}
                className="rounded-full transition-all"
                style={{ width: heroIdx === i ? 20 : 6, height: 6, background: heroIdx === i ? 'white' : 'rgba(255,255,255,0.45)' }} />
            ))}
          </div>
        )}
      </div>

      {/* Details card */}
      <div className="relative -mt-6 overflow-hidden rounded-t-[28px] md:mx-auto md:-mt-14 md:max-w-6xl md:rounded-[28px] md:shadow-[0_18px_60px_rgba(30,15,15,.12)]" style={{ background: surface }}>
        {/* Logo + brand name row */}
        <div className="px-5 pt-5 pb-0 flex items-center gap-3 md:px-8 md:pt-8">
          <img src={venue.avatarImage} alt={venue.name}
            className="w-14 h-14 rounded-2xl object-cover shadow-md shrink-0"
            style={{ border: `2px solid ${border}` }} />
          <div className="min-w-0">
            <h1 className="text-[20px] font-black leading-tight truncate" style={{ color: ink }}>{venue.name}</h1>
            <p className="text-[12px] truncate" style={{ color: muted }}>{venue.subtitle}</p>
          </div>
        </div>

        <div className="px-5 pt-3 pb-4 md:grid md:grid-cols-2 md:gap-x-8 md:px-8">
          {/* Status row */}
          <div className="flex items-center gap-2 text-[13px] mb-4" style={{ color: muted }}>
            <span className="flex items-center gap-1 font-semibold" style={{ color: RED }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill={RED}><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              Verified
            </span>
            <span>|</span>
            <span>{venue.openHours}</span>
          </div>
          {/* Stats row */}
          <div className="flex items-center gap-3 rounded-[16px] px-4 py-3 mb-4" style={{ border: `1px solid ${border}` }}>
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-1">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#FFC107"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span className="text-[14px] font-bold" style={{ color: ink }}>{venue.rating}</span>
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: muted }}>({venue.reviewCount} Reviews)</p>
            </div>
            <div className="w-px h-8" style={{ background: border }} />
            <div className="flex-1 text-center">
              <p className="text-[13px] font-bold" style={{ color: ink }}>{venue.stat2Value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: muted }}>{venue.stat2Label}</p>
            </div>
            <div className="w-px h-8" style={{ background: border }} />
            <div className="flex-1 text-center">
              <p className="text-[13px] font-bold" style={{ color: ink }}>{venue.stat3Value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: muted }}>{venue.stat3Label}</p>
            </div>
          </div>

          {/* Book CTA button */}
          <button
            onClick={() => onBook ? (venue.offerings[0] && onBook(venue.offerings[0].id)) : setCalOpen(true)}
            className="w-full flex items-center gap-3 rounded-[16px] px-4 py-4 mb-4 text-white"
            style={{ background: RED }}>
            <div className="h-10 w-10 rounded-[10px] flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.25)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div className="flex-1 text-left">
              <p className="text-[15px] font-black">{venue.ctaLabel}</p>
              <p className="text-[11px] opacity-80">Reserve your spot for this experience</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>

          {/* Promo banner */}
          <div className="flex items-center justify-between rounded-[14px] px-4 py-3 mb-5"
            style={{ background: dark ? '#1A1010' : '#FFF5F5', border: `1px solid ${dark ? '#3A2020' : '#FFD6D4'}` }}>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-[10px] flex items-center justify-center" style={{ background: dark ? '#2A1010' : '#FFEBE8' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
              </div>
              <div>
                <p className="text-[13px] font-bold" style={{ color: ink }}>{venue.promoTitle}</p>
                <p className="text-[11px]" style={{ color: muted }}>{venue.promoDesc}</p>
              </div>
            </div>
            <button onClick={() => onBook ? (venue.offerings[0] && onBook(venue.offerings[0].id)) : setCalOpen(true)} className="rounded-full px-3 py-1.5 text-[11px] font-bold text-white shrink-0 ml-2" style={{ background: RED }}>Book Now</button>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto px-5 pb-3 [scrollbar-width:none] md:px-8"
          style={{ borderBottom: `1px solid ${border}` }}>
          {venue.categories.map(cat => {
            const active = activeCategory === cat
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className="shrink-0 rounded-full px-4 py-2 text-[13px] font-bold"
                style={{
                  background: active ? RED : 'transparent',
                  color: active ? '#fff' : ink,
                  border: active ? 'none' : `1px solid ${border}`,
                }}>
                {cat}
              </button>
            )
          })}
        </div>

        {/* Offerings list */}
        <div className="grid grid-cols-1 gap-x-8 px-5 pt-4 pb-36 md:grid-cols-2 md:px-8 md:pb-12">
          {filtered.map((item, i) => (
            <div key={item.id}
              className="flex items-center gap-4 py-4"
              style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${border}` : 'none' }}>
              <div className="w-[100px] h-[80px] rounded-[14px] overflow-hidden shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-[14px] font-black mb-0.5" style={{ color: ink }}>{item.name}</p>
                    <p className="text-[12px] mb-1" style={{ color: muted }}>{item.desc}</p>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: item.tagColor }}>
                      🎉 {item.tag}
                    </span>
                  </div>
                  <button aria-label={`Save ${item.name}`} onClick={() => onSaveOffering ? onSaveOffering(item.id) : toggle(item.id)} className="ml-2 shrink-0 mt-0.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={isSaved(item.id) ? RED : 'none'} stroke={isSaved(item.id) ? RED : muted} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <p className="text-[14px] font-black" style={{ color: ink }}>{formatPrice(item.price)}</p>
                    <div className="flex items-center gap-1">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="#FFC107"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      <span className="text-[11px]" style={{ color: muted }}>{item.rating} ({item.reviews} Reviews)</span>
                    </div>
                  </div>
                  {venue.orderable ? (() => {
                    const itemQty = cart.venueItems(venue.id).find(ci => ci.itemId === item.id)?.qty ?? 0
                    return itemQty > 0 ? (
                      <div className="flex items-center gap-1.5 rounded-lg border-2 px-2 h-9" style={{ borderColor: RED }}>
                        <button aria-label={`Remove ${item.name}`} onClick={() => cart.removeItem(`${venue.id}__${item.id}`)}
                          className="font-bold text-[18px]" style={{ color: RED }}>−</button>
                        <span className="text-[13px] font-black w-4 text-center" style={{ color: ink }}>{itemQty}</span>
                        <button aria-label={`Add ${item.name}`} onClick={() => cart.addItem({ venueId: venue.id, venueName: venue.name, venueImage: venue.avatarImage, itemId: item.id, name: item.name, price: item.price, image: item.image })}
                          className="font-bold text-[18px]" style={{ color: RED }}>+</button>
                      </div>
                    ) : (
                      <button aria-label={`Add ${item.name}`} onClick={() => cart.addItem({ venueId: venue.id, venueName: venue.name, venueImage: venue.avatarImage, itemId: item.id, name: item.name, price: item.price, image: item.image })}
                        className="h-9 w-9 rounded-lg border-2 flex items-center justify-center"
                        style={{ borderColor: RED }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      </button>
                    )
                  })() : (
                    <button aria-label={`View availability for ${item.name}`} onClick={() => onBook ? onBook(item.id) : setCalOpen(true)}
                      className="h-9 w-9 rounded-lg border-2 flex items-center justify-center"
                      style={{ borderColor: RED }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky cart bar — shown when items from this venue are in cart (orderable venues only) */}
      {venue.orderable && venueCartQty > 0 && (
        <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-[382px] z-[90] md:max-w-[560px]">
          <button onClick={() => navigate({ name: 'globalCart' })}
            className="w-full rounded-[20px] px-5 py-3.5 flex items-center justify-between shadow-[0_8px_30px_rgba(250,63,56,0.4)]"
            style={{ background: RED }}>
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-white text-[11px] font-black">{venueCartQty}</span>
              <span className="text-white text-[13px] font-bold">View Cart</span>
            </div>
            <span className="text-white text-[14px] font-black">{formatPrice2(venueCartTotal)}</span>
          </button>
        </div>
      )}

    </div>
    <CalendarSheet
      open={calOpen}
      onClose={() => setCalOpen(false)}
      onConfirm={(date, time) => navigate({ name: 'checkout', venueId: venue.id, bookingDate: date, bookingTime: time })}
      venueTimeType={VENUE_TIME_TYPE[venue.id] ?? 'default'}
      venueName={venue.name}
    />
    </>
  )
}
