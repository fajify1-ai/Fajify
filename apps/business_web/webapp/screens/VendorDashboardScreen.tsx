import BusinessSettings from '../components/BusinessSettings'
import { useDialogFocus } from '../components/useDialogFocus'
import { useBusinessState } from '../store/useBusinessState'
import { useState, useRef, type ReactElement } from "react"
import { useDarkMode } from "../store/darkMode"
import QRScanner from "../components/QRScanner"
import {
  HEALTH_FACTOR_META,
  resolveBusinessHealth,
  type HealthFactorKey,
} from "../businessHealth"

type Props = { onExit: () => void }

const AMBER = "#F59E0B"
function fmt(n: number) {
  return "₦" + n.toLocaleString("en-NG")
}

const NIGERIAN_BANKS = [
  "Access Bank",
  "First Bank of Nigeria",
  "Guaranty Trust Bank",
  "Kuda Bank",
  "OPay",
  "PalmPay",
  "Stanbic IBTC Bank",
  "Sterling Bank",
  "United Bank for Africa",
  "Wema Bank",
  "Zenith Bank",
]

// ── Business profiles ─────────────────────────────────────────────────────────

const BUSINESSES = [
  {
    id: "shiro",
    name: "Shiro Lagos",
    type: "Fine Dining & Bar",
    accent: "#FA3F38",
    initial: "S",
    cover:
      "/reference/bcf4a93d14cc342f.jpg",
    greeting: "Good evening, Shiro Lagos",
    stats: [
      { label: "Today's Revenue", val: "₦140,000", up: true },
      { label: "Active Tables", val: "8 / 12", up: true },
      { label: "Pending Orders", val: "3", up: false },
      { label: "Avg Rating", val: "4.8 ★", up: true },
    ],
    weekTotal: "₦853,000",
    weekChange: "+18.4%",
    tabs: ["Overview", "Reservations", "Orders", "Menu", "Services"],
  },
  {
    id: "landmark",
    name: "Landmark Beach",
    type: "Beach Club & Resort",
    accent: "#0EA5E9",
    initial: "L",
    cover:
      "/reference/f969d091f89c8773.jpg",
    greeting: "Good afternoon, Landmark Beach",
    stats: [
      { label: "Today's Revenue", val: "₦285,000", up: true },
      { label: "Day Passes Sold", val: "38", up: true },
      { label: "Cabana Requests", val: "6", up: false },
      { label: "Avg Rating", val: "4.7 ★", up: true },
    ],
    weekTotal: "₦1,920,000",
    weekChange: "+24.1%",
    tabs: ["Overview", "Day Passes", "Requests", "Activities", "Services"],
  },
  {
    id: "filmhouse",
    name: "Filmhouse Cinemas",
    type: "Cinema & Entertainment",
    accent: "#7C3AED",
    initial: "F",
    cover:
      "/reference/7bb73beb43f28ee5.jpg",
    greeting: "Good evening, Filmhouse",
    stats: [
      { label: "Today's Revenue", val: "₦94,500", up: true },
      { label: "Tickets Sold", val: "214", up: true },
      { label: "Concession Orders", val: "67", up: true },
      { label: "Avg Rating", val: "4.6 ★", up: true },
    ],
    weekTotal: "₦621,000",
    weekChange: "+11.2%",
    tabs: ["Overview", "Screenings", "Concessions", "Programmes", "Services"],
  },
  {
    id: "zenSpa",
    name: "Zen Spa & Wellness",
    type: "Spa & Wellness Centre",
    accent: "#10B981",
    initial: "Z",
    cover:
      "/reference/2ce1e4ec87356560.jpg",
    greeting: "Good morning, Zen Spa",
    stats: [
      { label: "Today's Revenue", val: "₦68,000", up: true },
      { label: "Appointments", val: "12", up: true },
      { label: "Pending Check-ins", val: "3", up: false },
      { label: "Avg Rating", val: "4.9 ★", up: true },
    ],
    weekTotal: "₦412,000",
    weekChange: "+9.7%",
    tabs: ["Overview", "Appointments", "Add-ons", "Treatments", "Services"],
  },
  {
    id: "quilox",
    name: "Quilox Nightclub",
    type: "Nightclub & Events",
    accent: "#EC4899",
    initial: "Q",
    cover:
      "/reference/46b198888f9d6098.jpg",
    greeting: "Good evening, Quilox",
    stats: [
      { label: "Tonight's Revenue", val: "₦520,000", up: true },
      { label: "VIP Tables", val: "24", up: true },
      { label: "Bar Orders", val: "87", up: true },
      { label: "Avg Rating", val: "4.5 ★", up: true },
    ],
    weekTotal: "₦3,640,000",
    weekChange: "+42.8%",
    tabs: ["Overview", "Table Res.", "Bar Orders", "Events", "Services"],
  },
]

type Biz = typeof BUSINESSES[0]

// ── Business-specific mock data ────────────────────────────────────────────────

type Booking = {
  id: string
  name: string
  detail: string
  date: string
  time: string
  guests: number
  amount: number
  status: string
}
type Order = {
  id: string
  item: string
  customer: string
  amount: number
  time: string
  status: string
}
type Product = {
  id: string
  name: string
  cat: string
  price: number
  available: boolean
  image: string
}

const BIZ_DATA: Record<string, {
  bookings: Booking[]
  orders: Order[]
  products: Product[]
}> = {
  shiro: {
    bookings: [
      {
        id: "b1",
        name: "Amara & Chidi",
        detail: "Premium Package",
        date: "Sat 30 Aug",
        time: "07:00 PM",
        guests: 4,
        amount: 50000,
        status: "confirmed",
      },
      {
        id: "b2",
        name: "Tobi Adeyemi",
        detail: "Starter Package",
        date: "Sat 30 Aug",
        time: "08:00 PM",
        guests: 2,
        amount: 20000,
        status: "pending",
      },
      {
        id: "b3",
        name: "Grace Okafor",
        detail: "Premium Package",
        date: "Sun 31 Aug",
        time: "06:00 PM",
        guests: 2,
        amount: 50000,
        status: "confirmed",
      },
      {
        id: "b4",
        name: "Emeka Eze",
        detail: "Starter Package",
        date: "Mon 1 Sep",
        time: "07:30 PM",
        guests: 2,
        amount: 20000,
        status: "pending",
      },
      {
        id: "b5",
        name: "Fatima Bello",
        detail: "Premium Package",
        date: "Fri 22 Aug",
        time: "08:00 PM",
        guests: 4,
        amount: 50000,
        status: "completed",
      },
    ],
    orders: [
      {
        id: "o1",
        item: "Jollof Rice & Chicken",
        customer: "Amara Johnson",
        amount: 14000,
        time: "2 min ago",
        status: "new",
      },
      {
        id: "o2",
        item: "Grilled Snapper + Drinks",
        customer: "Tobi Adeyemi",
        amount: 22000,
        time: "14 min ago",
        status: "preparing",
      },
      {
        id: "o3",
        item: "Starter Package Add-ons",
        customer: "Grace Okafor",
        amount: 9000,
        time: "28 min ago",
        status: "ready",
      },
      {
        id: "o4",
        item: "Champagne Bottle",
        customer: "Emeka Eze",
        amount: 45000,
        time: "1h ago",
        status: "completed",
      },
      {
        id: "o5",
        item: "Dessert Platter",
        customer: "David Nwachukwu",
        amount: 8500,
        time: "Yesterday",
        status: "completed",
      },
    ],
    products: [
      {
        id: "p1",
        name: "Grilled Snapper",
        cat: "Mains",
        price: 22000,
        available: true,
        image:
          "/reference/868d9945e11a497a.jpg",
      },
      {
        id: "p2",
        name: "Jollof Rice",
        cat: "Mains",
        price: 7000,
        available: true,
        image:
          "/reference/374ef0240c61a033.jpg",
      },
      {
        id: "p3",
        name: "Suya Platter",
        cat: "Starters",
        price: 12000,
        available: true,
        image:
          "/reference/1c1a8ffbded7465e.jpg",
      },
      {
        id: "p4",
        name: "Mocktail Pitcher",
        cat: "Drinks",
        price: 4000,
        available: false,
        image:
          "/reference/preview-mocktail.svg",
      },
      {
        id: "p5",
        name: "Champagne 750ml",
        cat: "Drinks",
        price: 45000,
        available: true,
        image:
          "/reference/9c1ca94e6e01c60b.jpg",
      },
      {
        id: "p6",
        name: "Dessert Platter",
        cat: "Desserts",
        price: 8500,
        available: true,
        image:
          "/reference/fa6405a34b8a970b.jpg",
      },
    ],
  },
  landmark: {
    bookings: [
      {
        id: "b1",
        name: "Uchenna Obi",
        detail: "Cabana A · Full Day",
        date: "Sat 30 Aug",
        time: "10:00 AM",
        guests: 6,
        amount: 120000,
        status: "confirmed",
      },
      {
        id: "b2",
        name: "Sade Williams",
        detail: "Standard Day Pass",
        date: "Sat 30 Aug",
        time: "09:00 AM",
        guests: 2,
        amount: 30000,
        status: "pending",
      },
      {
        id: "b3",
        name: "Dare Adeniyi",
        detail: "Cabana B · Half Day",
        date: "Sat 30 Aug",
        time: "01:00 PM",
        guests: 4,
        amount: 60000,
        status: "confirmed",
      },
      {
        id: "b4",
        name: "Ngozi Eze",
        detail: "VIP Pool Access",
        date: "Sun 31 Aug",
        time: "11:00 AM",
        guests: 3,
        amount: 45000,
        status: "pending",
      },
      {
        id: "b5",
        name: "Lanre Adesanya",
        detail: "Standard Day Pass",
        date: "Fri 22 Aug",
        time: "10:00 AM",
        guests: 2,
        amount: 30000,
        status: "completed",
      },
    ],
    orders: [
      {
        id: "o1",
        item: "Poolside Jollof + Fried Fish",
        customer: "Cabana A",
        amount: 28000,
        time: "5 min ago",
        status: "new",
      },
      {
        id: "o2",
        item: "6× Heineken + Ice Bucket",
        customer: "Cabana B",
        amount: 18000,
        time: "20 min ago",
        status: "preparing",
      },
      {
        id: "o3",
        item: "Fresh Coconut ×4",
        customer: "Pool Deck",
        amount: 4000,
        time: "35 min ago",
        status: "ready",
      },
      {
        id: "o4",
        item: "Grilled Lobster",
        customer: "Cabana A",
        amount: 65000,
        time: "2h ago",
        status: "completed",
      },
    ],
    products: [
      {
        id: "p1",
        name: "Standard Day Pass",
        cat: "Passes",
        price: 15000,
        available: true,
        image:
          "/reference/a2ed4935efcaf2e9.jpg",
      },
      {
        id: "p2",
        name: "VIP Pool Access",
        cat: "Passes",
        price: 25000,
        available: true,
        image:
          "/reference/8e037712228c350a.jpg",
      },
      {
        id: "p3",
        name: "Cabana Half Day",
        cat: "Cabanas",
        price: 60000,
        available: true,
        image:
          "/reference/14db66d5d01f5ba2.jpg",
      },
      {
        id: "p4",
        name: "Cabana Full Day",
        cat: "Cabanas",
        price: 120000,
        available: true,
        image:
          "/reference/8e037712228c350a.jpg",
      },
      {
        id: "p5",
        name: "Jet Ski (1 hr)",
        cat: "Activities",
        price: 35000,
        available: true,
        image:
          "/reference/908a8b857d57098c.jpg",
      },
      {
        id: "p6",
        name: "Boat Cruise",
        cat: "Activities",
        price: 50000,
        available: false,
        image:
          "/reference/42678ee21105de07.jpg",
      },
    ],
  },
  filmhouse: {
    bookings: [
      {
        id: "b1",
        name: "Avengers: Endgame",
        detail: "Screen 1 · 42 seats",
        date: "Sat 30 Aug",
        time: "06:00 PM",
        guests: 42,
        amount: 252000,
        status: "confirmed",
      },
      {
        id: "b2",
        name: "Black Panther",
        detail: "Screen 2 · 38 seats",
        date: "Sat 30 Aug",
        time: "08:30 PM",
        guests: 38,
        amount: 228000,
        status: "confirmed",
      },
      {
        id: "b3",
        name: "Wakanda Forever",
        detail: "Screen 3 · 15 seats",
        date: "Sat 30 Aug",
        time: "09:00 PM",
        guests: 15,
        amount: 90000,
        status: "pending",
      },
      {
        id: "b4",
        name: "The Lion King",
        detail: "Screen 1 · 60 seats",
        date: "Sun 31 Aug",
        time: "02:00 PM",
        guests: 60,
        amount: 360000,
        status: "confirmed",
      },
      {
        id: "b5",
        name: "Top Gun: Maverick",
        detail: "Screen 2 · 28 seats",
        date: "Fri 22 Aug",
        time: "07:00 PM",
        guests: 28,
        amount: 168000,
        status: "completed",
      },
    ],
    orders: [
      {
        id: "o1",
        item: "Large Popcorn ×2",
        customer: "Screen 1 · Row C",
        amount: 6000,
        time: "3 min ago",
        status: "new",
      },
      {
        id: "o2",
        item: "Combo: Popcorn + Drinks",
        customer: "Screen 2 · Row E",
        amount: 20000,
        time: "12 min ago",
        status: "preparing",
      },
      {
        id: "o3",
        item: "Nachos + Cheese Dip",
        customer: "Screen 3 · Row A",
        amount: 4500,
        time: "25 min ago",
        status: "ready",
      },
      {
        id: "o4",
        item: "Kids Meal ×2",
        customer: "Screen 1 · Row G",
        amount: 8000,
        time: "1h ago",
        status: "completed",
      },
    ],
    products: [
      {
        id: "p1",
        name: "Standard Ticket",
        cat: "Tickets",
        price: 6000,
        available: true,
        image:
          "/reference/fd4f5b82b87ed9a2.jpg",
      },
      {
        id: "p2",
        name: "Premium Ticket",
        cat: "Tickets",
        price: 9000,
        available: true,
        image:
          "/reference/bcaf33b1812bfc6b.jpg",
      },
      {
        id: "p3",
        name: "Large Popcorn",
        cat: "Concessions",
        price: 3000,
        available: true,
        image:
          "/reference/a500aead2f6c3859.jpg",
      },
      {
        id: "p4",
        name: "Combo Meal",
        cat: "Concessions",
        price: 5000,
        available: true,
        image:
          "/reference/1c1a8ffbded7465e.jpg",
      },
      {
        id: "p5",
        name: "Premium Experience",
        cat: "Packages",
        price: 18000,
        available: true,
        image:
          "/reference/060c961252037966.jpg",
      },
      {
        id: "p6",
        name: "Kids Pack",
        cat: "Packages",
        price: 8000,
        available: false,
        image:
          "/reference/224b38f9e535022e.jpg",
      },
    ],
  },
  zenSpa: {
    bookings: [
      {
        id: "b1",
        name: "Adaeze Nwosu",
        detail: "Deep Tissue · Therapist Bola",
        date: "Sat 30 Aug",
        time: "10:00 AM",
        guests: 1,
        amount: 35000,
        status: "confirmed",
      },
      {
        id: "b2",
        name: "Ify Okonkwo",
        detail: "Couples Spa Package",
        date: "Sat 30 Aug",
        time: "11:30 AM",
        guests: 2,
        amount: 80000,
        status: "confirmed",
      },
      {
        id: "b3",
        name: "Chisom Eze",
        detail: "Facial + Manicure",
        date: "Sat 30 Aug",
        time: "01:00 PM",
        guests: 1,
        amount: 22000,
        status: "pending",
      },
      {
        id: "b4",
        name: "Kemi Adesanya",
        detail: "Hot Stone · Therapist Aisha",
        date: "Sun 31 Aug",
        time: "03:00 PM",
        guests: 1,
        amount: 40000,
        status: "pending",
      },
      {
        id: "b5",
        name: "Tolu Bello",
        detail: "Full Body Wrap",
        date: "Fri 22 Aug",
        time: "02:00 PM",
        guests: 1,
        amount: 28000,
        status: "completed",
      },
    ],
    orders: [
      {
        id: "o1",
        item: "Herbal Tea Bundle",
        customer: "Adaeze Nwosu",
        amount: 2500,
        time: "5 min ago",
        status: "new",
      },
      {
        id: "o2",
        item: "Aromatherapy Candle Set",
        customer: "Ify Okonkwo",
        amount: 8500,
        time: "20 min ago",
        status: "preparing",
      },
      {
        id: "o3",
        item: "Essential Oil Upgrade",
        customer: "Chisom Eze",
        amount: 5000,
        time: "40 min ago",
        status: "ready",
      },
      {
        id: "o4",
        item: "CBD Body Oil",
        customer: "Tolu Bello",
        amount: 12000,
        time: "2h ago",
        status: "completed",
      },
    ],
    products: [
      {
        id: "p1",
        name: "Deep Tissue Massage",
        cat: "Massage",
        price: 35000,
        available: true,
        image:
          "/reference/9f150284fc2fed73.jpg",
      },
      {
        id: "p2",
        name: "Hot Stone Massage",
        cat: "Massage",
        price: 40000,
        available: true,
        image:
          "/reference/51d6aea00e80626e.jpg",
      },
      {
        id: "p3",
        name: "Luxury Facial",
        cat: "Skincare",
        price: 18000,
        available: true,
        image:
          "/reference/3ec5464364d1adf4.jpg",
      },
      {
        id: "p4",
        name: "Couples Package",
        cat: "Packages",
        price: 80000,
        available: true,
        image:
          "/reference/b7bf17648d90d9ef.jpg",
      },
      {
        id: "p5",
        name: "Full Body Wrap",
        cat: "Body",
        price: 28000,
        available: true,
        image:
          "/reference/8b4631ccd28d7de0.jpg",
      },
      {
        id: "p6",
        name: "Sauna Session",
        cat: "Wellness",
        price: 12000,
        available: false,
        image:
          "/reference/91a2d9b1c66c28ae.jpg",
      },
    ],
  },
  quilox: {
    bookings: [
      {
        id: "b1",
        name: "VIP Section A — T1",
        detail: "Damilola Ogunsanya · Min. ₦500k",
        date: "Sat 30 Aug",
        time: "11:00 PM",
        guests: 8,
        amount: 500000,
        status: "confirmed",
      },
      {
        id: "b2",
        name: "VIP Section B — T3",
        detail: "Kunle Badmus · Min. ₦300k",
        date: "Sat 30 Aug",
        time: "10:30 PM",
        guests: 6,
        amount: 300000,
        status: "confirmed",
      },
      {
        id: "b3",
        name: "VIP Section C — T2",
        detail: "Seun Abiodun · Min. ₦200k",
        date: "Sat 30 Aug",
        time: "11:30 PM",
        guests: 4,
        amount: 200000,
        status: "pending",
      },
      {
        id: "b4",
        name: "Regular — Floor 1",
        detail: "Chidera Obi · Entry Package",
        date: "Sun 31 Aug",
        time: "09:00 PM",
        guests: 10,
        amount: 100000,
        status: "pending",
      },
      {
        id: "b5",
        name: "VIP Section A — T2",
        detail: "Ade Fashola · Min. ₦500k",
        date: "Fri 22 Aug",
        time: "10:00 PM",
        guests: 8,
        amount: 500000,
        status: "completed",
      },
    ],
    orders: [
      {
        id: "o1",
        item: "Hennessy XO + Mixers",
        customer: "VIP Sec A · T1",
        amount: 180000,
        time: "8 min ago",
        status: "new",
      },
      {
        id: "o2",
        item: "Moët Rosé ×2",
        customer: "VIP Sec B · T3",
        amount: 120000,
        time: "22 min ago",
        status: "preparing",
      },
      {
        id: "o3",
        item: "Whisky Tower + Ice Bucket",
        customer: "Floor 1 · T4",
        amount: 85000,
        time: "40 min ago",
        status: "ready",
      },
      {
        id: "o4",
        item: "Remy Martin 1738",
        customer: "VIP Sec C · T2",
        amount: 150000,
        time: "1h ago",
        status: "completed",
      },
    ],
    products: [
      {
        id: "p1",
        name: "Standard Entry",
        cat: "Entry",
        price: 10000,
        available: true,
        image:
          "/reference/9c1ca94e6e01c60b.jpg",
      },
      {
        id: "p2",
        name: "VIP Entry",
        cat: "Entry",
        price: 25000,
        available: true,
        image:
          "/reference/3d85dee16c54a4e4.jpg",
      },
      {
        id: "p3",
        name: "Hennessy XO 700ml",
        cat: "Bottles",
        price: 180000,
        available: true,
        image:
          "/reference/82980a293c0fbc36.jpg",
      },
      {
        id: "p4",
        name: "Moët & Chandon Rosé",
        cat: "Bottles",
        price: 60000,
        available: true,
        image:
          "/reference/9c1ca94e6e01c60b.jpg",
      },
      {
        id: "p5",
        name: "VIP Table Section A",
        cat: "Tables",
        price: 500000,
        available: true,
        image:
          "/reference/9c1ca94e6e01c60b.jpg",
      },
      {
        id: "p6",
        name: "Sparkler Parade",
        cat: "Add-ons",
        price: 15000,
        available: true,
        image:
          "/reference/0786787d68648cdd.jpg",
      },
    ],
  },
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> =
  {
    confirmed: { bg: "#22c55e18", text: "#22c55e", label: "Confirmed" },
    pending: { bg: "#F59E0B18", text: "#F59E0B", label: "Pending" },
    completed: { bg: "#6B728018", text: "#6B7280", label: "Done" },
    cancelled: { bg: "#EF444418", text: "#EF4444", label: "Cancelled" },
    new: { bg: "#FA3F3818", text: "#FA3F38", label: "New" },
    preparing: { bg: "#F59E0B18", text: "#F59E0B", label: "Preparing" },
    ready: { bg: "#22c55e18", text: "#22c55e", label: "Ready" },
  }

function Chip({ status }: { status: string }) {
  const s = STATUS_BADGE[status] ?? {
    bg: "#88888818",
    text: "#888",
    label: status,
  }
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[10px] font-black shrink-0"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  )
}

// ── fajify services (module-level — no ACCENT reference) ────────────────────────

const FAJI_SERVICES = [
  {
    id: "reservations",
    name: "Table & Seat Reservations",
    tagline: "Let customers book in advance",
    color: "#FA3F38",
    enabled: true,
    stat1l: "This month",
    stat1v: "86",
    stat2l: "Avg. value",
    stat2v: "₦34,000",
  },
  {
    id: "ordering",
    name: "In-Venue Ordering",
    tagline: "Table-side digital ordering",
    color: "#F59E0B",
    enabled: true,
    stat1l: "Orders/week",
    stat1v: "142",
    stat2l: "Via ordering",
    stat2v: "₦890,000",
  },
  {
    id: "tickets",
    name: "Event Tickets",
    tagline: "Sell tickets right on fajify",
    color: "#8B5CF6",
    enabled: false,
    stat1l: "Sold/season",
    stat1v: "1,240",
    stat2l: "Last event",
    stat2v: "₦3.1M",
  },
  {
    id: "delivery",
    name: "Delivery & Takeout",
    tagline: "Reach customers beyond your walls",
    color: "#22C55E",
    enabled: false,
    stat1l: "Orders/week",
    stat1v: "67",
    stat2l: "Avg. value",
    stat2v: "₦18,500",
  },
  {
    id: "ride",
    name: "fajify Ride Integration",
    tagline: "Guests arrive, stress-free",
    color: "#3B82F6",
    enabled: true,
    stat1l: "Rides/month",
    stat1v: "34",
    stat2l: "Ride revenue",
    stat2v: "₦289,000",
  },
  {
    id: "loyalty",
    name: "Loyalty & Rewards",
    tagline: "Keep them coming back",
    color: "#F97316",
    enabled: false,
    stat1l: "Members",
    stat1v: "312",
    stat2l: "Pts redeemed",
    stat2v: "24,800",
  },
  {
    id: "packages",
    name: "Curated Date Packages",
    tagline: "Offer unforgettable experiences",
    color: "#EC4899",
    enabled: true,
    stat1l: "Sold/month",
    stat1v: "58",
    stat2l: "Avg. value",
    stat2v: "₦75,000",
  },
  {
    id: "gifting",
    name: "Gifting & Add-ons",
    tagline: "The little extras that delight",
    color: "#14B8A6",
    enabled: false,
    stat1l: "Add-ons/mo",
    stat1v: "94",
    stat2l: "Add-on rev.",
    stat2v: "₦1.2M",
  },
]

const REVENUE_DATA = [22, 45, 38, 60, 52, 80, 68]
const REVENUE_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const DAILY_CAPACITY: Record<string, {
  label: string
  unit: string
  used: number
  total: number
}> = {
  shiro: { label: "Table capacity", unit: "tables", used: 8, total: 12 },
  landmark: { label: "Day-pass capacity", unit: "passes", used: 38, total: 60 },
  filmhouse: { label: "Seat capacity", unit: "seats", used: 214, total: 300 },
  zenSpa: {
    label: "Appointment capacity",
    unit: "appointments",
    used: 12,
    total: 16,
  },
  quilox: { label: "VIP-table capacity", unit: "tables", used: 24, total: 30 },
}
const RESERVATION_CAPACITY: Record<string, {
  label: string
  unit: string
  total: number
}> = {
  shiro: { label: "Guest capacity", unit: "guests", total: 40 },
  landmark: { label: "Guest capacity", unit: "guests", total: 120 },
  filmhouse: { label: "Seat capacity", unit: "seats", total: 300 },
  zenSpa: { label: "Appointment capacity", unit: "appointments", total: 20 },
  quilox: { label: "Guest capacity", unit: "guests", total: 80 },
}
const BOOKING_PREORDERS: Record<string, string[]> = {
  "shiro:b1": ["2× Grilled Snapper", "1× Jollof Rice", "4× Chapman"],
  "shiro:b2": ["1× Suya Platter", "2× Mocktails"],
  "shiro:b3": ["2× Premium tasting menu"],
  "landmark:b1": ["1× Seafood platter", "6× Soft drinks"],
  "filmhouse:b1": ["8× Popcorn combos", "6× Kids packs"],
  "zenSpa:b2": ["2× Herbal tea service"],
  "quilox:b1": ["1× Hennessy XO", "2× Champagne"],
}
const CALENDAR_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]
const CALENDAR_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function bookingDateKey(dateLabel: string) {
  const [, day, month] = dateLabel.split(" ")
  const monthIndex = CALENDAR_MONTHS.indexOf(month)
  return monthIndex < 0
    ? ""
    : `2026-${String(monthIndex + 1).padStart(2, "0")}-${String(Number(day)).padStart(2, "0")}`
}

// ── Nav icons ─────────────────────────────────────────────────────────────────

function NavIcon({
  id,
  active,
  color,
}: {
  id: string
  active: boolean
  color: string
}): ReactElement {
  const s = { stroke: color, fill: "none", strokeWidth: "1.8" }
  if (id === "overview")
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
        <rect
          x="3"
          y="3"
          width="7"
          height="7"
          rx="1"
          fill={active ? color : "none"}
        />
        <rect
          x="14"
          y="3"
          width="7"
          height="7"
          rx="1"
          fill={active ? color : "none"}
        />
        <rect
          x="3"
          y="14"
          width="7"
          height="7"
          rx="1"
          fill={active ? color : "none"}
        />
        <rect
          x="14"
          y="14"
          width="7"
          height="7"
          rx="1"
          fill={active ? color : "none"}
        />
      </svg>
    )
  if (id === "tab2")
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
        <rect
          x="3"
          y="4"
          width="18"
          height="18"
          rx="2"
          fill={active ? color + "20" : "none"}
        />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    )
  if (id === "tab3")
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
        <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
          fill={active ? color + "15" : "none"}
        />
      </svg>
    )
  if (id === "tab4")
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
        <path
          d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"
          fill={active ? color + "15" : "none"}
        />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    )
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={active ? color + "25" : "none"}
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type TabId = "overview" | "tab2" | "tab3" | "tab4" | "services"

export default function VendorDashboardScreen({ onExit }: Props) {
  const { dark } = useDarkMode()

  const [supportMessage, setSupportMessage] = useState('')
  const [staffInviteOpen, setStaffInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('Floor Staff')
  const [invitedStaff, setInvitedStaff] = useState<Record<string, { name: string; role: string }[]>>({})
  const [checkedIn, setCheckedIn] = useState<Record<string, boolean>>({})
  const [showPicker, setShowPicker] = useState(false)
  const [biz, setBiz] = useState<Biz>(BUSINESSES[0])
  const [tab, setTab] = useState<TabId>("overview")
  const [bizPickerOpen, setBizPickerOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [healthOpen, setHealthOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingDetail, setSettingDetail] = useState<string | null>(null)
  // 'main' = settings list, string = detail page, null = closed
  const [settingsScreen, setSettingsScreen] = useState<"main" | string | null>(
    null,
  )
  const [payoutConfirmed, setPayoutConfirmed] = useState(false)
  const [payoutStage, setPayoutStage] =
    useState<"idle" | "review" | "submitted">("idle")
  const [payoutScreenOpen, setPayoutScreenOpen] = useState(false)
  const [bankDetails, setBankDetails] = useBusinessState(biz.id, {
    bank: "Guaranty Trust Bank",
    accountNumber: "0123456789",
    accountName: `${biz.name.toUpperCase()} LIMITED`,
  })
  const [bankSaved, setBankSaved] = useState(true)
  const [payoutMode, setPayoutMode] = useState<"all" | "custom">("all")
  const [customPayoutAmount, setCustomPayoutAmount] = useState("100000")
  const [businessMedia, setBusinessMedia] = useState<Record<string, {
    cover?: string
    logo?: string
  }>>({})
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [cancelOrderOpen, setCancelOrderOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("Item unavailable")
  const [hoursEdited, setHoursEdited] = useState<Record<string, boolean>>({})
  const [profileFields, setProfileFields] = useBusinessState(biz.id, {
    name: "",
    category: "",
    description:
      "A premier destination for unforgettable experiences in Lagos.",
    regNumber: "RC-1048291",
    year: "2018",
    owner: "fajify Partner Account",
  })
  const [contactFields, setContactFields] = useBusinessState(biz.id, {
    address: "14 Kofo Abayomi St, Victoria Island, Lagos",
    phone: "+234 818 000 1234",
    email: "",
    instagram: "",
  })
  const [profileSaved, setProfileSaved] = useState(false)
  const [contactSaved, setContactSaved] = useState(false)
  const [staffStatuses, setStaffStatuses] = useState<Record<string, boolean>>({
    "Adaeze Okonkwo": true,
    "Emeka Eze": true,
    "Chisom Bello": true,
    "Tunde Fashola": false,
  })
  const [deletedPhotos, setDeletedPhotos] = useState<number[]>([])
  const [photoAdded, setPhotoAdded] = useState(false)
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [newItemName, setNewItemName] = useState("")
  const [newItemPrice, setNewItemPrice] = useState("")
  const [newItemCat, setNewItemCat] = useState("")
  const [newItemImg, setNewItemImg] = useState("")
  const [newCategoryName, setNewCategoryName] = useState("")
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [customCategories, setCustomCategories] =
    useState<Record<string, string[]>>({})
  const [customProducts, setCustomProducts] =
    useState<Record<string, Product[]>>({})
  const tab4ScrollRef = useRef<HTMLDivElement>(null)

  // Interactive state
  const [bookingStatuses, setBookingStatuses] =
    useState<Record<string, string>>({})
  const [orderStatuses, setOrderStatuses] = useState<Record<string, string>>({})
  const [productAvail, setProductAvail] = useState<Record<string, boolean>>({})
  const [bookingFilter, setBookingFilter] = useState("all")
  const [orderFilter, setOrderFilter] = useState("active")
  const [reservationView, setReservationView] = useState<"calendar" | "list">(
    "calendar",
  )
  const [reservationMonth, setReservationMonth] = useState(7)
  const [selectedReservationDate, setSelectedReservationDate] =
    useState("2026-08-30")
  const [calendarBookingsExpanded, setCalendarBookingsExpanded] =
    useState(false)
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null)
  const [bookingCancelReason, setBookingCancelReason] = useState(
    "Guest requested cancellation",
  )
  const [bookingCancelReasons, setBookingCancelReasons] =
    useState<Record<string, string>>({})
  const [serviceEnabledByBusiness, setServiceEnabledByBusiness] =
    useState<Record<string, Record<string, boolean>>>(
      Object.fromEntries(
        BUSINESSES.map((business) => [
          business.id,
          Object.fromEntries(
            FAJI_SERVICES.map((service) => [service.id, service.enabled]),
          ),
        ]),
      ),
    )

  const businessPickerRef = useDialogFocus(bizPickerOpen, () => setBizPickerOpen(false))
  const healthDialogRef = useDialogFocus(healthOpen, () => setHealthOpen(false))

  const ACCENT = biz.accent
  const bg = dark ? "#0A0A0A" : "#F0F0F4"
  const surface = dark ? "#1A1A1A" : "#FFFFFF"
  const ink = dark ? "#F0F0F0" : "#1A1A1A"
  const muted = dark ? "#777" : "#888888"
  const border = dark ? "#252525" : "#E8E8E8"
  const subBg = dark ? "#141414" : "#F5F5F5"

  const data = BIZ_DATA[biz.id] ?? BIZ_DATA.shiro
  const serviceEnabled = serviceEnabledByBusiness[biz.id]
  const dailyCapacity = DAILY_CAPACITY[biz.id] ?? DAILY_CAPACITY.shiro
  const customerRating = Number.parseFloat(biz.stats[3].val)
  const health = resolveBusinessHealth(biz.id, customerRating)
  const healthTrend =
    health.delta > 0
      ? `↑ ${health.delta} point${health.delta === 1 ? "" : "s"}`
      : health.delta < 0
        ? `↓ ${Math.abs(health.delta)} point${health.delta === -1 ? "" : "s"}`
        : "No change"
  const products = [...data.products, ...(customProducts[biz.id] ?? [])]
  const menuCategories = Array.from(
    new Set([
      ...products.map((product) => product.cat),
      ...(customCategories[biz.id] ?? []),
    ]),
  )
  const maxRev = Math.max(...REVENUE_DATA)
  const coverFor = (business: Biz) =>
    businessMedia[business.id]?.cover ?? business.cover
  const logoFor = (business: Biz) => businessMedia[business.id]?.logo
  const updateBusinessImage = (kind: "cover" | "logo", file?: File) => {
    if (!file) return
    const imageUrl = URL.createObjectURL(file)
    setBusinessMedia((current) => ({
      ...current,
      [biz.id]: { ...current[biz.id], [kind]: imageUrl },
    }))
  }
  const openWithdraw = () => {
    setPayoutMode("all")
    setPayoutStage("idle")
    setPayoutScreenOpen(true)
  }

  const getBookingStatus = (id: string, orig: string) =>
    bookingStatuses[`${biz.id}:${id}`] ?? orig
  const getOrderStatus = (id: string, orig: string) =>
    orderStatuses[`${biz.id}:${id}`] ?? orig
  const getProductAvail = (id: string, orig: boolean) =>
    productAvail[`${biz.id}:${id}`] ?? orig

  const advanceBooking = (id: string, cur: string) => {
    const next: Record<string, string> = {
      pending: "confirmed",
      confirmed: "completed",
    }
    if (next[cur])
      setBookingStatuses((p) => ({ ...p, [`${biz.id}:${id}`]: next[cur] }))
  }
  const declineBooking = (id: string) =>
    setBookingStatuses((p) => ({ ...p, [`${biz.id}:${id}`]: "cancelled" }))
  const advanceOrder = (id: string, cur: string) => {
    const next: Record<string, string> = {
      new: "preparing",
      preparing: "ready",
      ready: "completed",
    }
    if (next[cur])
      setOrderStatuses((p) => ({ ...p, [`${biz.id}:${id}`]: next[cur] }))
  }
  const cancelOrder = (id: string) => {
    setOrderStatuses((p) => ({ ...p, [`${biz.id}:${id}`]: "cancelled" }))
    setCancelOrderOpen(false)
  }
  const toggleProduct = (id: string, orig: boolean) =>
    setProductAvail((p) => ({
      ...p,
      [`${biz.id}:${id}`]: !(p[`${biz.id}:${id}`] ?? orig),
    }))
  const toggleService = (id: string) => {
    const disabling = serviceEnabled[id]
    setServiceEnabledByBusiness((current) => ({
      ...current,
      [biz.id]: { ...current[biz.id], [id]: !current[biz.id][id] },
    }))
    if (
      disabling &&
      ((id === "reservations" && tab === "tab2") ||
        (id === "ordering" && tab === "tab3"))
    ) {
      setTab("overview")
    }
  }

  // ── Business account picker ──────────────────────────────────────────────────

  const LAST_ACTIVE: Record<string, string> = {
    shiro: "Active now",
    landmark: "Last seen 2h ago",
    filmhouse: "Last seen 5h ago",
    zenSpa: "Last seen yesterday",
    quilox: "Last seen 2 days ago",
  }

  const BTYPE_ICON: Record<string, string> = {
    shiro: "🍽️",
    landmark: "🏖️",
    filmhouse: "🎬",
    zenSpa: "🧘",
    quilox: "🎉",
  }

  if (showPicker) {
    return (
      <div
        className="min-h-screen w-full flex flex-col font-[family-name:var(--font-ui)] md:pl-24"
        style={{ background: bg }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 px-5 pt-14 pb-4">
          <div className="flex items-center justify-between mb-1">
            <p
              className="text-[11px] font-black uppercase tracking-[2px]"
              style={{ color: AMBER }}
            >
              fajify Business
            </p>
            <button
              onClick={onExit}
              className="h-8 w-8 rounded-full flex items-center justify-center"
              style={{ background: surface, border: `1px solid ${border}` }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke={muted}
                strokeWidth="2.5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <h1
            className="text-[26px] font-black tracking-tight"
            style={{ color: ink }}
          >
            Your Accounts
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: muted }}>
            Select a business to manage
          </p>
        </div>

        {/* Business list */}
        <div className="flex-1 px-5 grid grid-cols-1 gap-4 pb-10 overflow-y-auto [scrollbar-width:none] md:grid-cols-2 md:px-10 xl:grid-cols-3 lg:px-16">
          {BUSINESSES.map((b, i) => (
            <button
              key={b.id}
              onClick={() => {
                setBiz(b)
                setTab("overview")
                setShowPicker(false)
              }}
              className="w-full rounded-[22px] overflow-hidden relative text-left"
              style={{ background: surface, border: `1.5px solid ${border}` }}
            >
              {/* Cover strip */}
              <div className="relative w-full" style={{ height: 90 }}>
                <img
                  src={coverFor(b)}
                  alt={b.name}
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to right, rgba(5,5,12,0.75) 0%, rgba(5,5,12,0.2) 100%)",
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to bottom, transparent 30%, rgba(5,5,12,0.55) 100%)`,
                  }}
                />

                {/* Accent dot */}
                <div
                  className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full shadow"
                  style={{
                    background: b.accent,
                    boxShadow: `0 0 8px ${b.accent}`,
                  }}
                />

                {/* Business initial badge */}
                <div
                  className="absolute left-4 top-4 h-11 w-11 rounded-[14px] flex items-center justify-center text-white font-black text-[18px] shadow-lg overflow-hidden"
                  style={{ background: b.accent }}
                >
                  {logoFor(b) ? (
                    <img
                      src={logoFor(b)}
                      alt={`${b.name} logo`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    b.initial
                  )}
                </div>
              </div>

              {/* Info row */}
              <div className="px-4 py-3.5 flex items-center gap-3">
                <span className="text-[20px]">{BTYPE_ICON[b.id]}</span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[15px] font-black truncate"
                    style={{ color: ink }}
                  >
                    {b.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p
                      className="text-[11px] truncate"
                      style={{ color: muted }}
                    >
                      {b.type}
                    </p>
                    <span style={{ color: muted }}>·</span>
                    <p
                      className="text-[11px] shrink-0"
                      style={{
                        color:
                          LAST_ACTIVE[b.id] === "Active now"
                            ? "#22c55e"
                            : muted,
                      }}
                    >
                      {LAST_ACTIVE[b.id]}
                    </p>
                  </div>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={muted}
                  strokeWidth="2"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>

              {/* Stats preview strip */}
              <div className="px-4 pb-4 flex gap-3">
                {BIZ_DATA[b.id].bookings.filter((bk) => bk.status === "pending")
                  .length > 0 && (
                  <div
                    className="rounded-[10px] px-3 py-1.5 flex items-center gap-1.5"
                    style={{ background: AMBER + "18" }}
                  >
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: AMBER }}
                    />
                    <p
                      className="text-[10px] font-black"
                      style={{ color: AMBER }}
                    >
                      {
                        BIZ_DATA[b.id].bookings.filter(
                          (bk) => bk.status === "pending",
                        ).length
                      }{" "}
                      pending
                    </p>
                  </div>
                )}
                {BIZ_DATA[b.id].orders.filter((o) => o.status === "new")
                  .length > 0 && (
                  <div
                    className="rounded-[10px] px-3 py-1.5 flex items-center gap-1.5"
                    style={{ background: b.accent + "18" }}
                  >
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: b.accent }}
                    />
                    <p
                      className="text-[10px] font-black"
                      style={{ color: b.accent }}
                    >
                      {
                        BIZ_DATA[b.id].orders.filter((o) => o.status === "new")
                          .length
                      }{" "}
                      new {i === 0 ? "orders" : i === 2 ? "sales" : "orders"}
                    </p>
                  </div>
                )}
                <div
                  className="rounded-[10px] px-3 py-1.5"
                  style={{ background: "#22c55e18" }}
                >
                  <p
                    className="text-[10px] font-black"
                    style={{ color: "#22c55e" }}
                  >
                    {b.weekTotal}
                  </p>
                </div>
              </div>
            </button>
          ))}

          <button
            onClick={onExit}
            className="w-full rounded-[18px] py-4 text-[14px] font-black mt-2"
            style={{
              background: surface,
              border: `1.5px solid ${border}`,
              color: muted,
            }}
          >
            ← Back to Portal
          </button>
        </div>
      </div>
    )
  }

  // ── Overview ────────────────────────────────────────────────────────────────

  const renderOverview = () => {
    const reservationsOn = serviceEnabled.reservations
    const orderingOn = serviceEnabled.ordering
    const pendingBookings = reservationsOn
      ? data.bookings.filter(
          (item) => getBookingStatus(item.id, item.status) === "pending",
        ).length
      : 0
    const handledBookings = reservationsOn
      ? data.bookings.filter((item) =>
          ["confirmed", "completed"].includes(
            getBookingStatus(item.id, item.status),
          ),
        ).length
      : 0
    const activeOrders = orderingOn
      ? data.orders.filter((item) =>
          ["new", "preparing", "ready"].includes(
            getOrderStatus(item.id, item.status),
          ),
        ).length
      : 0
    const completedOrders = orderingOn
      ? data.orders.filter(
          (item) => getOrderStatus(item.id, item.status) === "completed",
        ).length
      : 0
    const newOrders = orderingOn
      ? data.orders.filter(
          (item) => getOrderStatus(item.id, item.status) === "new",
        ).length
      : 0
    const preparingOrders = orderingOn
      ? data.orders.filter(
          (item) => getOrderStatus(item.id, item.status) === "preparing",
        ).length
      : 0
    const readyOrders = orderingOn
      ? data.orders.filter(
          (item) => getOrderStatus(item.id, item.status) === "ready",
        ).length
      : 0
    const capacity = dailyCapacity
    const capacityPercent = Math.round((capacity.used / capacity.total) * 100)

    return (
      <div className="vendor-overview pb-36 overflow-y-auto [scrollbar-width:none]">
        <div
          className="mx-5 mt-3 rounded-[20px] p-5"
          style={{ background: surface, border: `1px solid ${border}` }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: muted }}
              >
                Today's revenue
              </p>
              <p className="text-[28px] font-black mt-1" style={{ color: ink }}>
                {biz.stats[0].val}
              </p>
              <p
                className="text-[10px] font-bold mt-1"
                style={{ color: "#16A34A" }}
              >
                {biz.weekChange} from last week
              </p>
            </div>
            <button
              onClick={openWithdraw}
              className="rounded-[12px] px-3.5 py-2.5 text-[11px] font-black"
              style={{ color: ACCENT, background: ACCENT + "10" }}
            >
              View balance
            </button>
          </div>
          <div
            className="grid grid-cols-2 gap-3 mt-4 pt-4"
            style={{ borderTop: `1px solid ${border}` }}
          >
            <div>
              <p className="text-[10px]" style={{ color: muted }}>
                Available balance
              </p>
              <p
                className="text-[15px] font-black mt-0.5"
                style={{ color: ink }}
              >
                ₦320,000
              </p>
            </div>
            <div>
              <p className="text-[10px]" style={{ color: muted }}>
                Customer rating
              </p>
              <p
                className="text-[15px] font-black mt-0.5"
                style={{ color: ink }}
              >
                {biz.stats[3].val}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setHealthOpen(true)}
          className="mx-5 mt-4 w-[calc(100%_-_40px)] rounded-[20px] p-4 text-left"
          style={{ background: surface, border: `1px solid ${border}` }}
          aria-label={`Business health score ${health.overall} out of 100. View details`}
        >
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0">
              <svg
                width="64"
                height="64"
                viewBox="0 0 64 64"
                style={{ transform: "rotate(-90deg)" }}
              >
                <circle
                  cx="32"
                  cy="32"
                  r="25"
                  fill="none"
                  stroke={subBg}
                  strokeWidth="6"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="25"
                  fill="none"
                  stroke={health.status.color}
                  strokeWidth="6"
                  strokeDasharray={`${(health.overall / 100) * 157} 157`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="text-[17px] font-black leading-none"
                  style={{ color: ink }}
                >
                  {health.overall}
                </span>
                <span
                  className="text-[8px] font-bold mt-0.5"
                  style={{ color: muted }}
                >
                  /100
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[14px] font-black" style={{ color: ink }}>
                  Business health
                </p>
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-black"
                  style={{
                    color: health.status.color,
                    background: health.status.color + "14",
                  }}
                >
                  {health.status.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="text-[10px] font-black"
                  style={{
                    color:
                      health.delta < 0
                        ? "#EF4444"
                        : health.delta > 0
                          ? "#16A34A"
                          : muted,
                  }}
                >
                  {healthTrend}
                </span>
                <span className="text-[10px]" style={{ color: muted }}>
                  · {health.updatedAt}
                </span>
              </div>
              <p
                className="text-[10px] leading-relaxed mt-1.5 line-clamp-2"
                style={{ color: muted }}
              >
                {health.insight}
              </p>
            </div>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke={muted}
              strokeWidth="2.5"
              className="shrink-0"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </button>

        <div
          className="mx-5 mt-4 rounded-[20px] p-4"
          style={{ background: surface, border: `1px solid ${border}` }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[14px] font-black" style={{ color: ink }}>
                Today's capacity
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: muted }}>
                {capacity.label}
              </p>
            </div>
            <p className="text-[13px] font-black" style={{ color: ACCENT }}>
              {capacity.used} / {capacity.total}
            </p>
          </div>
          <div
            className="h-2 rounded-full mt-3 overflow-hidden"
            style={{ background: subBg }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${capacityPercent}%`, background: ACCENT }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <p className="text-[10px]" style={{ color: muted }}>
              {capacityPercent}% booked
            </p>
            <p className="text-[10px] font-bold" style={{ color: ink }}>
              {capacity.total - capacity.used} {capacity.unit} available
            </p>
          </div>
        </div>

        {(reservationsOn || orderingOn) && (
          <div className="mx-5 mt-4 grid grid-cols-2 gap-3">
            {reservationsOn && (
              <button
                onClick={() => setTab("tab2")}
                className="rounded-[18px] p-4 text-left"
                style={{ background: surface, border: `1px solid ${border}` }}
              >
                <p className="text-[10px] font-bold" style={{ color: muted }}>
                  RESERVATIONS
                </p>
                <p
                  className="text-[22px] font-black mt-1"
                  style={{ color: ink }}
                >
                  {handledBookings}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: muted }}>
                  handled · {pendingBookings} pending
                </p>
              </button>
            )}
            {orderingOn && (
              <button
                onClick={() => setTab("tab3")}
                className="rounded-[18px] p-4 text-left"
                style={{ background: surface, border: `1px solid ${border}` }}
              >
                <p className="text-[10px] font-bold" style={{ color: muted }}>
                  ORDERS
                </p>
                <p
                  className="text-[22px] font-black mt-1"
                  style={{ color: ink }}
                >
                  {completedOrders}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: muted }}>
                  completed · {activeOrders} active
                </p>
              </button>
            )}
          </div>
        )}

        {(pendingBookings > 0 || activeOrders > 0) && (
          <div className="mx-5 mt-5">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <p className="text-[15px] font-black" style={{ color: ink }}>
                  Next tasks
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: muted }}>
                  Work through these to keep operations moving
                </p>
              </div>
              <span
                className="text-[10px] font-black rounded-full px-2 py-1"
                style={{ color: ACCENT, background: ACCENT + "12" }}
              >
                {pendingBookings + activeOrders}
              </span>
            </div>
            <div
              className="rounded-[20px] overflow-hidden"
              style={{ background: surface, border: `1px solid ${border}` }}
            >
              {pendingBookings > 0 && (
                <button
                  onClick={() => setTab("tab2")}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                  style={{
                    borderBottom:
                      activeOrders > 0 ? `1px solid ${border}` : "none",
                  }}
                >
                  <div
                    className="h-10 w-10 rounded-[12px] flex items-center justify-center shrink-0"
                    style={{ background: AMBER + "14", color: AMBER }}
                  >
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p
                      className="text-[13px] font-black"
                      style={{ color: ink }}
                    >
                      {pendingBookings} booking{pendingBookings > 1 ? "s" : ""}{" "}
                      awaiting confirmation
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: muted }}>
                      Review soon to keep your response rate high
                    </p>
                  </div>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={muted}
                    strokeWidth="2.5"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              )}
              {activeOrders > 0 && (
                <button
                  onClick={() => setTab("tab3")}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                >
                  <div
                    className="h-10 w-10 rounded-[12px] flex items-center justify-center shrink-0"
                    style={{ background: ACCENT + "12", color: ACCENT }}
                  >
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M6 2h12l2 5-2 3H6L4 7l2-5Z" />
                      <path d="M6 10v10h12V10" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p
                      className="text-[13px] font-black"
                      style={{ color: ink }}
                    >
                      {activeOrders} active order{activeOrders > 1 ? "s" : ""}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: muted }}>
                      {newOrders} new · {preparingOrders} preparing ·{" "}
                      {readyOrders} ready
                    </p>
                  </div>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={muted}
                    strokeWidth="2.5"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mx-5 mt-5">
          <p className="text-[15px] font-black mb-2.5" style={{ color: ink }}>
            Quick actions
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              {
                label: "Scan QR",
                path: "M4 4h5v5H4zM15 4h5v5h-5zM4 15h5v5H4zM15 15h5v5h-5z",
                action: () => setScannerOpen(true),
              },
              {
                label: "Add item",
                path: "M12 5v14M5 12h14",
                action: () => setAddItemOpen(true),
              },
              {
                label: "Withdraw",
                path: "M4 7h16v11H4zM16 12h4M7 7V5h10v2",
                action: openWithdraw,
              },
            ].map((action) => (
              <button
                key={action.label}
                onClick={action.action}
                className="rounded-[16px] flex flex-col items-center gap-2 py-3.5"
                style={{ background: surface, border: `1px solid ${border}` }}
              >
                <div
                  className="h-9 w-9 rounded-[11px] flex items-center justify-center"
                  style={{ background: ACCENT + "10" }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={ACCENT}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={action.path} />
                  </svg>
                </div>
                <p className="text-[10px] font-black" style={{ color: ink }}>
                  {action.label}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div
          className="mx-5 mt-5 rounded-[20px] p-4"
          style={{ background: surface, border: `1px solid ${border}` }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[14px] font-black" style={{ color: ink }}>
                Revenue this week
              </p>
              <p
                className="text-[20px] font-black mt-0.5"
                style={{ color: ink }}
              >
                {biz.weekTotal}
              </p>
            </div>
            <span
              className="text-[11px] font-black rounded-full px-2.5 py-1"
              style={{ color: "#16A34A", background: "#22C55E14" }}
            >
              {biz.weekChange}
            </span>
          </div>
          <div className="flex items-end gap-2 h-[82px]">
            {REVENUE_DATA.map((value, index) => (
              <div
                key={REVENUE_LABELS[index]}
                className="flex-1 flex flex-col items-center gap-1.5"
              >
                <div
                  className="w-full rounded-t-[5px]"
                  style={{
                    height: `${Math.round((value / maxRev) * 60)}px`,
                    background:
                      index === 5 ? ACCENT : dark ? "#303030" : "#ECECF0",
                  }}
                />
                <p
                  className="text-[8px] font-bold"
                  style={{ color: index === 5 ? ACCENT : muted }}
                >
                  {REVENUE_LABELS[index]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {reservationsOn && (
          <div className="mx-5 mt-5 mb-2">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <p className="text-[15px] font-black" style={{ color: ink }}>
                  Upcoming
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: muted }}>
                  Your next confirmed bookings
                </p>
              </div>
              <button
                onClick={() => setTab("tab2")}
                className="text-[11px] font-black"
                style={{ color: ACCENT }}
              >
                View all
              </button>
            </div>
            <div className="flex flex-col gap-2.5">
              {data.bookings
                .filter(
                  (item) =>
                    getBookingStatus(item.id, item.status) !== "completed",
                )
                .slice(0, 2)
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTab("tab2")}
                    className="w-full flex items-center gap-3 rounded-[16px] px-4 py-3.5 text-left"
                    style={{
                      background: surface,
                      border: `1px solid ${border}`,
                    }}
                  >
                    <div
                      className="h-10 w-10 rounded-[12px] flex flex-col items-center justify-center shrink-0"
                      style={{ background: ACCENT + "10", color: ACCENT }}
                    >
                      <span className="text-[8px] font-black uppercase">
                        {item.date.split(" ")[0]}
                      </span>
                      <span className="text-[14px] font-black leading-none">
                        {item.date.split(" ")[1]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[12px] font-black truncate"
                        style={{ color: ink }}
                      >
                        {item.name}
                      </p>
                      <p
                        className="text-[10px] truncate mt-0.5"
                        style={{ color: muted }}
                      >
                        {item.time} · {item.guests} guest
                        {item.guests > 1 ? "s" : ""}
                      </p>
                    </div>
                    <Chip status={getBookingStatus(item.id, item.status)} />
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Tab 2: Bookings / Reservations / Screenings / Appointments / Table Res ──

  const calendarDate = new Date(2026, reservationMonth, 1)
  const calendarYear = calendarDate.getFullYear()
  const calendarMonthIndex = calendarDate.getMonth()
  const firstCalendarDay = new Date(
    calendarYear,
    calendarMonthIndex,
    1,
  ).getDay()
  const daysInCalendarMonth = new Date(
    calendarYear,
    calendarMonthIndex + 1,
    0,
  ).getDate()
  const reservationCapacity =
    RESERVATION_CAPACITY[biz.id] ?? RESERVATION_CAPACITY.shiro
  const calendarLoads = data.bookings.reduce<Record<string, {
    bookings: number
    guests: number
  }>>((loads, booking) => {
    if (getBookingStatus(booking.id, booking.status) === "cancelled")
      return loads
    const key = bookingDateKey(booking.date)
    if (!key) return loads
    const current = loads[key] ?? { bookings: 0, guests: 0 }
    loads[key] = {
      bookings: current.bookings + 1,
      guests: current.guests + booking.guests,
    }
    return loads
  }, {})
  const selectedDayBookings = data.bookings.filter(
    (booking) => bookingDateKey(booking.date) === selectedReservationDate,
  )
  const selectedDayLoad = calendarLoads[selectedReservationDate] ?? {
    bookings: 0,
    guests: 0,
  }
  const listBookings = data.bookings.filter(
    (item) =>
      bookingFilter === "all" ||
      getBookingStatus(item.id, item.status) === bookingFilter,
  )
  const visibleBookings =
    reservationView === "calendar" ? selectedDayBookings : listBookings
  const moveReservationMonth = (direction: number) => {
    const nextMonth = reservationMonth + direction
    const nextDate = new Date(2026, nextMonth, 1)
    setReservationMonth(nextMonth)
    setSelectedReservationDate(
      `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-01`,
    )
    setCalendarBookingsExpanded(false)
  }

  const renderTab2 = () => (
    <div className="pb-36 overflow-y-auto [scrollbar-width:none]">
      <div className="vendor-tab-panel px-5 mt-5 md:px-10 lg:px-16">
        <button
          aria-label="Simulate QR scan" onClick={() => setScannerOpen(true)}
          className="w-full flex items-center justify-between rounded-[18px] px-4 py-3.5 mb-4"
          style={{
            background: ACCENT + "12",
            border: `1.5px solid ${ACCENT}30`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-[10px] flex items-center justify-center"
              style={{ background: ACCENT }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="5" height="5" rx="1" />
                <rect x="16" y="3" width="5" height="5" rx="1" />
                <rect x="3" y="16" width="5" height="5" rx="1" />
                <path d="M16 16h5v5M16 16v5" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-[13px] font-black" style={{ color: ACCENT }}>
                Scan Guest QR — Check-in
              </p>
              <p className="text-[11px]" style={{ color: ACCENT + "AA" }}>
                Verify ticket before entry
              </p>
            </div>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={ACCENT}
            strokeWidth="2.5"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        <div
          className="grid grid-cols-2 gap-1 p-1 rounded-[13px] mb-4"
          style={{ background: subBg }}
        >
          {(["calendar", "list"] as const).map((view) => {
            const active = reservationView === view
            return (
              <button
                key={view}
                onClick={() => setReservationView(view)}
                className="rounded-[10px] py-2.5 text-[11px] font-black capitalize"
                style={{
                  background: active ? surface : "transparent",
                  color: active ? ink : muted,
                  boxShadow: active ? "0 1px 4px rgba(0,0,0,.08)" : "none",
                }}
              >
                {view === "calendar" ? "Calendar" : "All reservations"}
              </button>
            )
          })}
        </div>

        {reservationView === "calendar" ? (
          <>
            <div
              className="rounded-[18px] p-4 mb-4"
              style={{ background: surface, border: `1px solid ${border}` }}
            >
              <div className="flex items-center justify-between mb-4">
                <button
                  aria-label="Previous reservation month" onClick={() => moveReservationMonth(-1)}
                  className="h-8 w-8 rounded-full flex items-center justify-center"
                  style={{ background: subBg }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={ink}
                    strokeWidth="2.5"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <div className="text-center">
                  <p className="text-[16px] font-black md:text-[20px]" style={{ color: ink }}>
                    {CALENDAR_MONTH_NAMES[calendarMonthIndex]} {calendarYear}
                  </p>
                  <p className="text-[11px] mt-0.5 md:text-[12px]" style={{ color: muted }}>
                    Tap a day to see reservations
                  </p>
                </div>
                <button
                  aria-label="Next reservation month" onClick={() => moveReservationMonth(1)}
                  className="h-8 w-8 rounded-full flex items-center justify-center"
                  style={{ background: subBg }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={ink}
                    strokeWidth="2.5"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-7 mb-1.5">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                  <p
                    key={`${day}-${index}`}
                    className="text-center text-[11px] font-black py-1.5 md:text-[13px]"
                    style={{ color: muted }}
                  >
                    {day}
                  </p>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstCalendarDay }).map((_, index) => (
                  <div key={`blank-${index}`} />
                ))}
                {Array.from({ length: daysInCalendarMonth }).map((_, index) => {
                  const day = index + 1
                  const key = `${calendarYear}-${String(calendarMonthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                  const load = calendarLoads[key] ?? { bookings: 0, guests: 0 }
                  const selected = selectedReservationDate === key
                  const utilization = load.guests / reservationCapacity.total
                  const loadColor =
                    utilization >= 0.9
                      ? "#EF4444"
                      : utilization >= 0.7
                        ? AMBER
                        : ACCENT
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedReservationDate(key)
                        setCalendarBookingsExpanded(false)
                      }}
                      className="min-h-[58px] rounded-[10px] flex flex-col items-center justify-center md:min-h-[78px] md:rounded-[12px]"
                      style={{
                        background: selected
                          ? ACCENT
                          : load.bookings > 0
                            ? loadColor + "0D"
                            : "transparent",
                        border: `1px solid ${
                          selected
                            ? ACCENT
                            : load.bookings > 0
                              ? loadColor + "30"
                              : "transparent"
                        }`,
                      }}
                    >
                      <span
                        className="text-[13px] font-black md:text-[16px]"
                        style={{ color: selected ? "#fff" : ink }}
                      >
                        {day}
                      </span>
                      {load.bookings > 0 && (
                        <>
                          <span
                            className="text-[10px] font-black mt-0.5 md:text-[12px]"
                            style={{ color: selected ? "#fff" : loadColor }}
                          >
                            {load.bookings} bk
                          </span>
                          <span
                            className="text-[9px] md:text-[11px]"
                            style={{ color: selected ? "#ffffffbb" : muted }}
                          >
                            {load.guests}/{reservationCapacity.total}
                          </span>
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
              <div
                className="flex items-center gap-4 mt-4 pt-3"
                style={{ borderTop: `1px solid ${border}` }}
              >
                {[
                  { color: ACCENT, label: "Available" },
                  { color: AMBER, label: "Filling up" },
                  { color: "#EF4444", label: "Near full" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: item.color }}
                    />
                    <span
                      className="text-[10px] font-semibold md:text-[11px]"
                      style={{ color: muted }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-[18px] p-4 mb-4"
              style={{ background: surface, border: `1px solid ${border}` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[13px] font-black" style={{ color: ink }}>
                    {new Date(
                      `${selectedReservationDate}T12:00:00`,
                    ).toLocaleDateString("en-NG", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: muted }}>
                    {selectedDayLoad.bookings} booking
                    {selectedDayLoad.bookings === 1 ? "" : "s"}
                  </p>
                </div>
                <p className="text-[11px] font-black" style={{ color: ACCENT }}>
                  {reservationCapacity.label}
                </p>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: subBg }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round((selectedDayLoad.guests / reservationCapacity.total) * 100))}%`,
                    background: ACCENT,
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                  { label: "Capacity", value: reservationCapacity.total },
                  { label: "Reserved", value: selectedDayLoad.guests },
                  {
                    label: "Remaining",
                    value: Math.max(
                      0,
                      reservationCapacity.total - selectedDayLoad.guests,
                    ),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[11px] px-2 py-2.5 text-center"
                    style={{ background: subBg }}
                  >
                    <p
                      className="text-[16px] font-black md:text-[18px]"
                      style={{
                        color: item.label === "Remaining" ? "#16A34A" : ink,
                      }}
                    >
                      {item.value}
                    </p>
                    <p className="text-[10px] mt-0.5 md:text-[11px]" style={{ color: muted }}>
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <button
              disabled={selectedDayBookings.length === 0}
              onClick={() =>
                setCalendarBookingsExpanded((expanded) => !expanded)
              }
              className="w-full rounded-[16px] px-4 py-3.5 mb-4 flex items-center justify-between disabled:opacity-60"
              style={{ background: surface, border: `1px solid ${border}` }}
            >
              <div className="text-left">
                <p className="text-[12px] font-black" style={{ color: ink }}>
                  {selectedDayBookings.length === 0
                    ? "No reservations on this date"
                    : `${
                        calendarBookingsExpanded ? "Hide" : "View"
                      } ${selectedDayBookings.length} reservation${
                        selectedDayBookings.length === 1 ? "" : "s"
                      }`}
                </p>
                <p className="text-[9px] mt-0.5" style={{ color: muted }}>
                  Guest details, food orders and actions
                </p>
              </div>
              {selectedDayBookings.length > 0 && (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={muted}
                  strokeWidth="2.5"
                  style={{
                    transform: calendarBookingsExpanded
                      ? "rotate(180deg)"
                      : "none",
                    transition: "transform .2s ease",
                  }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              )}
            </button>
          </>
        ) : (
          <>
            <div
              className="rounded-[18px] p-4 mb-4"
              style={{ background: surface, border: `1px solid ${border}` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-black" style={{ color: ink }}>
                    Today at a glance
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: muted }}>
                    {dailyCapacity.label}
                  </p>
                </div>
                <p className="text-[14px] font-black" style={{ color: ACCENT }}>
                  {dailyCapacity.used} / {dailyCapacity.total}
                </p>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] mb-4">
              {[
                { id: "all", label: "All" },
                { id: "pending", label: "Pending" },
                { id: "confirmed", label: "Confirmed" },
                { id: "completed", label: "Completed" },
              ].map((filter) => {
                const active = bookingFilter === filter.id
                const count =
                  filter.id === "all"
                    ? data.bookings.length
                    : data.bookings.filter(
                        (item) =>
                          getBookingStatus(item.id, item.status) === filter.id,
                      ).length
                return (
                  <button
                    key={filter.id}
                    onClick={() => setBookingFilter(filter.id)}
                    className="shrink-0 rounded-full px-3.5 py-2 text-[11px] font-black"
                    style={{
                      background: active ? ACCENT : surface,
                      color: active ? "#fff" : muted,
                      border: `1px solid ${active ? ACCENT : border}`,
                    }}
                  >
                    {filter.label} {count}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {(reservationView === "list" || calendarBookingsExpanded) && (
          <div className="flex flex-col gap-3">
            {visibleBookings.map((b) => {
              const status = getBookingStatus(b.id, b.status)
              const preorder = BOOKING_PREORDERS[`${biz.id}:${b.id}`] ?? []
              return (
                <div
                  key={b.id}
                  className="rounded-[18px] p-4"
                  style={{
                    background: surface,
                    border: `1px solid ${
                      status === "pending" ? ACCENT + "40" : border
                    }`,
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-11 w-11 rounded-[14px] flex items-center justify-center text-white font-black text-[17px] shrink-0"
                        style={{ background: ACCENT }}
                      >
                        {b.name.charAt(0)}
                      </div>
                      <div>
                        <p
                          className="text-[14px] font-black"
                          style={{ color: ink }}
                        >
                          {b.name}
                        </p>
                        <p className="text-[11px]" style={{ color: muted }}>
                          {b.detail}
                        </p>
                        <p
                          className="text-[10px] font-bold mt-0.5 tracking-wider"
                          style={{ color: ACCENT + "BB" }}
                        >
                          REF#{biz.id.toUpperCase().slice(0, 3)}-
                          {b.id.toUpperCase()}-{new Date().getFullYear()}
                        </p>
                      </div>
                    </div>
                    <Chip status={status} />
                  </div>
                  <div
                    className="grid grid-cols-3 gap-2 rounded-[12px] p-3 mb-3"
                    style={{ background: subBg }}
                  >
                    {[
                      { label: "Date", val: b.date },
                      { label: "Time", val: b.time },
                      { label: "Guests", val: `${b.guests}` },
                    ].map((f) => (
                      <div key={f.label} className="text-center">
                        <p
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: muted }}
                        >
                          {f.label}
                        </p>
                        <p
                          className="text-[11px] font-black mt-0.5"
                          style={{ color: ink }}
                        >
                          {f.val}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div
                    className="rounded-[12px] p-3 mb-3"
                    style={{
                      background: preorder.length > 0 ? AMBER + "0D" : subBg,
                      border: `1px solid ${
                        preorder.length > 0 ? AMBER + "25" : "transparent"
                      }`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <p
                        className="text-[10px] font-black"
                        style={{ color: preorder.length > 0 ? AMBER : muted }}
                      >
                        FOOD PRE-ORDER
                      </p>
                      <span
                        className="text-[9px] font-bold"
                        style={{ color: preorder.length > 0 ? AMBER : muted }}
                      >
                        {preorder.length} item{preorder.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p
                      className="text-[10px] mt-1 leading-relaxed"
                      style={{ color: preorder.length > 0 ? ink : muted }}
                    >
                      {preorder.length > 0
                        ? preorder.join(" · ")
                        : "No food ordered ahead"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p
                      className="text-[15px] font-black"
                      style={{ color: ACCENT }}
                    >
                      {fmt(b.amount)}
                    </p>
                    <div className="flex gap-2">
                      {status === "pending" && (
                        <>
                          <button
                            onClick={() => setCancelBookingId(b.id)}
                            className="rounded-full px-3 py-2 text-[11px] font-black"
                            style={{
                              background: subBg,
                              color: muted,
                              border: `1px solid ${border}`,
                            }}
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => advanceBooking(b.id, status)}
                            className="rounded-full px-4 py-2 text-[12px] font-black text-white"
                            style={{ background: ACCENT }}
                          >
                            Confirm
                          </button>
                        </>
                      )}
                      {status === "confirmed" && (
                        <>
                          <button
                            onClick={() => setCancelBookingId(b.id)}
                            className="rounded-full px-3 py-2 text-[10px] font-black"
                            style={{
                              background: subBg,
                              color: "#EF4444",
                              border: `1px solid ${border}`,
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => advanceBooking(b.id, status)}
                            className="rounded-full px-4 py-2 text-[12px] font-black text-white"
                            style={{ background: "#22c55e" }}
                          >
                            Mark Done
                          </button>
                        </>
                      )}
                      {(status === "completed" || status === "cancelled") && (
                        <span
                          className="text-[11px] font-semibold"
                          style={{ color: muted }}
                        >
                          {status === "completed" ? "Completed ✓" : "Declined"}
                        </span>
                      )}
                    </div>
                  </div>
                  {cancelBookingId === b.id && (
                    <div
                      className="rounded-[14px] p-3 mt-3"
                      style={{
                        background: "#EF44440D",
                        border: "1px solid #EF444425",
                      }}
                    >
                      <p
                        className="text-[11px] font-black"
                        style={{ color: "#EF4444" }}
                      >
                        {status === "pending"
                          ? "Decline this reservation?"
                          : "Cancel this reservation?"}
                      </p>
                      <p
                        className="text-[9px] mt-1 mb-2.5"
                        style={{ color: muted }}
                      >
                        The guest will be notified with this reason.
                      </p>
                      <select
                        value={bookingCancelReason}
                        onChange={(event) =>
                          setBookingCancelReason(event.target.value)
                        }
                        className="w-full rounded-[11px] px-3 py-2.5 text-[11px] font-semibold outline-none border"
                        style={fieldStyle}
                      >
                        {[
                          "Guest requested cancellation",
                          "Capacity unavailable",
                          "Venue closed",
                          "Unable to accommodate request",
                        ].map((reason) => (
                          <option key={reason}>{reason}</option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-2 mt-2.5">
                        <button
                          onClick={() => setCancelBookingId(null)}
                          className="rounded-[11px] py-2.5 text-[10px] font-black"
                          style={{ background: surface, color: muted }}
                        >
                          Keep reservation
                        </button>
                        <button
                          onClick={() => {
                            declineBooking(b.id)
                            setBookingCancelReasons((current) => ({
                              ...current,
                              [`${biz.id}:${b.id}`]: bookingCancelReason,
                            }))
                            setCancelBookingId(null)
                          }}
                          className="rounded-[11px] py-2.5 text-[10px] font-black text-white"
                          style={{ background: "#EF4444" }}
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  )}
                  {status === "completed" && (
                    <div
                      className="flex items-center justify-between rounded-[12px] px-3 py-2.5 mt-3"
                      style={{ background: subBg }}
                    >
                      <div>
                        <p
                          className="text-[10px] font-black"
                          style={{ color: ink }}
                        >
                          Guest feedback
                        </p>
                        <p
                          className="text-[9px] mt-0.5"
                          style={{ color: muted }}
                        >
                          “Great service and quick check-in.”
                        </p>
                      </div>
                      <p
                        className="text-[12px] font-black"
                        style={{ color: AMBER }}
                      >
                        4.8 ★
                      </p>
                    </div>
                  )}
                  {status === "cancelled" &&
                    bookingCancelReasons[`${biz.id}:${b.id}`] && (
                      <div
                        className="rounded-[12px] px-3 py-2.5 mt-3"
                        style={{ background: "#EF44440D" }}
                      >
                        <p
                          className="text-[9px] font-black"
                          style={{ color: "#EF4444" }}
                        >
                          CANCELLATION REASON
                        </p>
                        <p
                          className="text-[10px] mt-1"
                          style={{ color: muted }}
                        >
                          {bookingCancelReasons[`${biz.id}:${b.id}`]}
                        </p>
                      </div>
                    )}
                </div>
              )
            })}
            {visibleBookings.length === 0 && (
              <div
                className="rounded-[18px] px-5 py-10 text-center"
                style={{ background: surface, border: `1px solid ${border}` }}
              >
                <div
                  className="mx-auto h-11 w-11 rounded-full flex items-center justify-center mb-3"
                  style={{ background: subBg }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={muted}
                    strokeWidth="1.8"
                  >
                    <path d="M8 2v4M16 2v4M3 10h18" />
                    <rect x="3" y="4" width="18" height="17" rx="3" />
                  </svg>
                </div>
                <p className="text-[13px] font-black" style={{ color: ink }}>
                  {reservationView === "calendar"
                    ? "No reservations on this day"
                    : `No ${
                        bookingFilter === "all" ? "" : bookingFilter
                      } bookings`}
                </p>
                <p className="text-[10px] mt-1" style={{ color: muted }}>
                  {reservationView === "calendar"
                    ? "Select another date to review its reservations."
                    : "Bookings matching this status will appear here."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  // ── Tab 3: Orders / Requests / Concessions / Add-ons / Bar Orders ────────────

  const renderTab3 = () => {
    const nextLabel: Record<string, string> = {
      new: "Accept",
      preparing: "Mark Ready",
      ready: "Complete",
    }
    const nextColor: Record<string, string> = {
      new: ACCENT,
      preparing: AMBER,
      ready: "#22c55e",
    }
    const orderFilters = [
      { id: "active", label: "Active" },
      { id: "new", label: "New" },
      { id: "preparing", label: "Preparing" },
      { id: "ready", label: "Ready" },
      { id: "completed", label: "Completed" },
    ]
    const filteredOrders = data.orders.filter((item) => {
      const status = getOrderStatus(item.id, item.status)
      return orderFilter === "active"
        ? ["new", "preparing", "ready"].includes(status)
        : status === orderFilter
    })
    return (
      <div className="pb-36 overflow-y-auto [scrollbar-width:none]">
        <div className="vendor-tab-panel px-5 mt-5 md:px-10 lg:px-16">
          <button
            aria-label="Simulate QR scan" onClick={() => setScannerOpen(true)}
            className="w-full flex items-center gap-3 rounded-[16px] px-4 py-3 mb-4"
            style={{
              background: AMBER + "12",
              border: `1.5px solid ${AMBER}30`,
            }}
          >
            <div
              className="h-8 w-8 rounded-[10px] flex items-center justify-center shrink-0"
              style={{ background: AMBER }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="5" height="5" rx="1" />
                <rect x="16" y="3" width="5" height="5" rx="1" />
                <rect x="3" y="16" width="5" height="5" rx="1" />
                <path d="M16 16h5v5M16 16v5" />
              </svg>
            </div>
            <p className="text-[13px] font-black" style={{ color: AMBER }}>
              Scan QR to Verify Order Recipient
            </p>
          </button>

          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] mb-4">
            {orderFilters.map((filter) => {
              const active = orderFilter === filter.id
              const count = data.orders.filter((item) => {
                const status = getOrderStatus(item.id, item.status)
                return filter.id === "active"
                  ? ["new", "preparing", "ready"].includes(status)
                  : status === filter.id
              }).length
              return (
                <button
                  key={filter.id}
                  onClick={() => setOrderFilter(filter.id)}
                  className="shrink-0 rounded-full px-3.5 py-2 text-[11px] font-black"
                  style={{
                    background: active ? ACCENT : surface,
                    color: active ? "#fff" : muted,
                    border: `1px solid ${active ? ACCENT : border}`,
                  }}
                >
                  {filter.label} {count}
                </button>
              )
            })}
          </div>

          <div className="flex flex-col gap-3">
            {filteredOrders.map((o) => {
              const status = getOrderStatus(o.id, o.status)
              const hasNext = status !== "completed" && status !== "cancelled"
              return (
                <div
                  key={o.id}
                  className="rounded-[18px] p-4"
                  style={{
                    background: surface,
                    border: `1px solid ${
                      status === "new" ? ACCENT + "40" : border
                    }`,
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-3">
                      <p
                        className="text-[14px] font-black"
                        style={{ color: ink }}
                      >
                        {o.item}
                      </p>
                      <p
                        className="text-[11px] mt-0.5"
                        style={{ color: muted }}
                      >
                        {o.customer} · {o.time}
                      </p>
                      <p
                        className="text-[10px] font-bold mt-0.5 tracking-wider"
                        style={{ color: ACCENT + "BB" }}
                      >
                        ORD#{biz.id.toUpperCase().slice(0, 3)}-
                        {o.id.toUpperCase()}-{new Date().getFullYear()}
                      </p>
                    </div>
                    <Chip status={status} />
                  </div>
                  <div
                    className="flex items-center justify-between pt-3"
                    style={{ borderTop: `1px solid ${border}` }}
                  >
                    <p
                      className="text-[15px] font-black"
                      style={{ color: ACCENT }}
                    >
                      {fmt(o.amount)}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedOrderId(o.id)
                          setCancelOrderOpen(false)
                        }}
                        className="rounded-full px-3 py-2 text-[11px] font-black"
                        style={{
                          background: subBg,
                          color: ink,
                          border: `1px solid ${border}`,
                        }}
                      >
                        View details
                      </button>
                      {hasNext ? (
                        <button
                          onClick={() => advanceOrder(o.id, status)}
                          className="rounded-full px-4 py-2 text-[12px] font-black text-white"
                          style={{ background: nextColor[status] ?? ACCENT }}
                        >
                          {nextLabel[status] ?? "Next"}
                        </button>
                      ) : (
                        <span
                          className="text-[11px] font-semibold"
                          style={{
                            color:
                              status === "cancelled" ? "#EF4444" : "#22c55e",
                          }}
                        >
                          {status === "cancelled" ? "Cancelled" : "Completed ✓"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {filteredOrders.length === 0 && (
              <div
                className="rounded-[18px] px-5 py-10 text-center"
                style={{ background: surface, border: `1px solid ${border}` }}
              >
                <div
                  className="mx-auto h-11 w-11 rounded-full flex items-center justify-center mb-3"
                  style={{ background: subBg }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={muted}
                    strokeWidth="1.8"
                  >
                    <path d="M6 2h12l2 5-2 3H6L4 7l2-5Z" />
                    <path d="M6 10v10h12V10" />
                  </svg>
                </div>
                <p className="text-[13px] font-black" style={{ color: ink }}>
                  No {orderFilter} orders
                </p>
                <p className="text-[10px] mt-1" style={{ color: muted }}>
                  Orders matching this status will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Tab 4: Menu / Activities / Programmes / Treatments / Events ──────────────

  const renderTab4 = () => (
    <div
      ref={tab4ScrollRef}
      className="pb-36 overflow-y-auto [scrollbar-width:none]"
    >
      <div className="vendor-tab-panel px-5 mt-5 md:px-10 lg:px-16">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[15px] font-black" style={{ color: ink }}>
            {products.length} {biz.tabs[3]}
          </p>
          <button
            onClick={() => {
              const sy = tab4ScrollRef.current?.scrollTop ?? 0
              setAddItemOpen(true)
              requestAnimationFrame(() => {
                if (tab4ScrollRef.current) tab4ScrollRef.current.scrollTop = sy
              })
            }}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-black text-white"
            style={{ background: ACCENT }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add {biz.tabs[3].replace(/s$/, "")}
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {products.map((p) => {
            const avail = getProductAvail(p.id, p.available)
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-[18px] p-3"
                style={{ background: surface, border: `1px solid ${border}` }}
              >
                <div className="h-16 w-16 rounded-[14px] overflow-hidden shrink-0">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-black" style={{ color: ink }}>
                    {p.name}
                  </p>
                  <p className="text-[11px] mb-1" style={{ color: muted }}>
                    {p.cat}
                  </p>
                  <p
                    className="text-[14px] font-black"
                    style={{ color: ACCENT }}
                  >
                    {fmt(p.price)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button role="switch" aria-label={`Availability of ${p.name}`} aria-checked={avail}
                    onClick={() => toggleProduct(p.id, p.available)}
                    className="relative h-6 rounded-full"
                    style={{
                      background: avail ? ACCENT : dark ? "#333" : "#DDD",
                      width: 44,
                    }}
                  >
                    <div
                      className="absolute top-1 h-4 w-4 rounded-full bg-white shadow"
                      style={{
                        left: avail ? "24px" : "4px",
                        transition: "left 0.15s",
                      }}
                    />
                  </button>
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: avail ? "#22c55e" : muted }}
                  >
                    {avail ? "Available" : "Off"}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  // ── Services tab ──────────────────────────────────────────────────────────────

  const renderServices = () => (
    <div className="vendor-services-grid pb-36 overflow-y-auto [scrollbar-width:none]">
      <div
        className="mx-5 mt-5 rounded-[22px] px-5 py-5 relative overflow-hidden"
        style={{
          background: dark ? "#0D0D0D" : "#F8F8F8",
          border: `1px solid ${border}`,
        }}
      >
        <div className="absolute right-4 top-4 opacity-10">
          <svg width="80" height="80" viewBox="0 0 48 48" fill={ACCENT}>
            <polygon
              points="24,2 28,16 42,16 32,25 35,39 24,31 13,39 16,25 6,16 20,16"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p
          className="text-[11px] font-black uppercase tracking-widest mb-2"
          style={{ color: ACCENT }}
        >
          fajify Business Suite
        </p>
        <h2
          className="text-[20px] font-black leading-snug mb-2"
          style={{ color: ink }}
        >
          {Object.values(serviceEnabled).filter(Boolean).length} of{" "}
          {FAJI_SERVICES.length} active
        </h2>
        <p className="text-[12px] leading-relaxed" style={{ color: muted }}>
          Enable services to unlock new revenue streams for {biz.name}.
        </p>
      </div>

      <div className="px-5 mt-4 flex flex-col gap-4 mb-4">
        {FAJI_SERVICES.map((svc) => {
          const on = serviceEnabled[svc.id]
          return (
            <div
              key={svc.id}
              className="rounded-[22px] overflow-hidden"
              style={{
                background: surface,
                border: `2px solid ${on ? svc.color + "40" : border}`,
                boxShadow: on ? `0 4px 24px ${svc.color}18` : "none",
              }}
            >
              <div
                className="px-4 py-4 flex items-center justify-between"
                style={{
                  background: on ? svc.color + "10" : subBg,
                  borderBottom: `1px solid ${on ? svc.color + "20" : border}`,
                }}
              >
                <div className="flex-1 min-w-0 mr-3">
                  <p
                    className="text-[14px] font-black"
                    style={{ color: on ? svc.color : ink }}
                  >
                    {svc.name}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: muted }}>
                    {svc.tagline}
                  </p>
                </div>
                <button role="switch" aria-label={svc.name} aria-checked={on}
                  onClick={() => toggleService(svc.id)}
                  className="relative h-7 rounded-full shrink-0 transition-colors duration-200"
                  style={{
                    background: on ? svc.color : dark ? "#333" : "#CCC",
                    width: 52,
                  }}
                >
                  <div
                    className="absolute top-1.5 h-4 w-4 rounded-full bg-white shadow-md transition-all duration-200"
                    style={{ left: on ? "30px" : "4px" }}
                  />
                </button>
              </div>
              {on ? (
                <div className="grid grid-cols-2 gap-2.5 p-4">
                  {[
                    { l: svc.stat1l, v: svc.stat1v },
                    { l: svc.stat2l, v: svc.stat2v },
                  ].map((s) => (
                    <div
                      key={s.l}
                      className="rounded-[12px] p-3"
                      style={{
                        background: svc.color + "0D",
                        border: `1px solid ${svc.color}20`,
                      }}
                    >
                      <p
                        className="text-[10px] font-bold uppercase tracking-wider mb-1"
                        style={{ color: svc.color + "AA" }}
                      >
                        {s.l}
                      </p>
                      <p
                        className="text-[16px] font-black"
                        style={{ color: svc.color }}
                      >
                        {s.v}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-4">
                  <button
                    onClick={() => toggleService(svc.id)}
                    className="w-full rounded-[14px] py-3 text-[13px] font-black border-2"
                    style={{
                      borderColor: svc.color + "50",
                      color: svc.color,
                      background: svc.color + "08",
                    }}
                  >
                    Enable {svc.name.split(" ").slice(0, 2).join(" ")} →
                  </button>
                </div>
              )}
            </div>
          )
        })}

        <button
          onClick={onExit}
          className="w-full rounded-[16px] py-3.5 text-[14px] font-black mt-2"
          style={{
            background: surface,
            border: `1px solid ${border}`,
            color: ink,
          }}
        >
          ← Back to Business entry
        </button>
        <button onClick={onExit}
          className="w-full rounded-[16px] py-3 text-[13px] font-bold"
          style={{ color: muted }}
        >
          Log Out
        </button>
      </div>
    </div>
  )

  // ── Modals / sheets ───────────────────────────────────────────────────────────

  const fieldStyle = { background: subBg, borderColor: border, color: ink }

  const SETTING_CONTENT: Record<string, {
    title: string
    body: () => React.ReactNode
  }> = {
    "Business Profile": {
      title: "Business Profile",
      body: () => {
        const pf = profileFields
        const setPF =
          (k: keyof typeof profileFields) =>
          (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setProfileFields((p) => ({ ...p, [k]: e.target.value }))
        return (
          <div className="flex flex-col">
            {[
              {
                label: "Business Name",
                key: "name" as const,
                placeholder: biz.name,
              },
              {
                label: "Category",
                key: "category" as const,
                placeholder: biz.type,
              },
              {
                label: "Reg. Number",
                key: "regNumber" as const,
                placeholder: "RC-1048291",
              },
              {
                label: "Year Established",
                key: "year" as const,
                placeholder: "2018",
              },
              {
                label: "Owner",
                key: "owner" as const,
                placeholder: "fajify Partner Account",
              },
            ].map((f, i, arr) => (
              <div
                key={f.key}
                className="px-4 py-3"
                style={{ borderBottom: `1px solid ${border}` }}
              >
                <p
                  className="text-[10px] font-black uppercase tracking-wider mb-1"
                  style={{ color: muted }}
                >
                  {f.label}
                </p>
                <input
                  aria-label={f.label} value={pf[f.key]}
                  onChange={setPF(f.key)}
                  placeholder={f.placeholder}
                  className="w-full text-[14px] font-semibold outline-none bg-transparent"
                  style={{ color: ink }}
                />
              </div>
            ))}
            <div
              className="px-4 py-3"
              style={{ borderBottom: `1px solid ${border}` }}
            >
              <p
                className="text-[10px] font-black uppercase tracking-wider mb-1"
                style={{ color: muted }}
              >
                Description
              </p>
              <textarea
                value={pf.description}
                onChange={(e) =>
                  setProfileFields((p) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
                rows={3}
                className="w-full text-[14px] font-semibold outline-none bg-transparent resize-none"
                style={{ color: ink }}
              />
            </div>
            <div className="px-4 py-4">
              <button
                onClick={() => {
                  setProfileSaved(true)
                  setTimeout(() => setProfileSaved(false), 2000)
                }}
                className="w-full rounded-[14px] py-3.5 text-[13px] font-black text-white"
                style={{ background: profileSaved ? "#22c55e" : ACCENT }}
              >
                {profileSaved ? "✓ Saved" : "Save Changes"}
              </button>
            </div>
          </div>
        )
      },
    },
    "Photos & Gallery": {
      title: "Photos & Gallery",
      body: () => {
        const allPhotos = [
          { i: 0, src: coverFor(biz) },
          {
            i: 1,
            src: "/reference/8eeea502e2c3c89e.jpg",
          },
          {
            i: 2,
            src: "/reference/a38c938ed5c5f933.jpg",
          },
          {
            i: 3,
            src: "/reference/affdf473fa411161.jpg",
          },
          {
            i: 4,
            src: "/reference/8642e1c0e4f7ff6a.jpg",
          },
        ].filter((p) => !deletedPhotos.includes(p.i))
        return (
          <div className="p-4 flex flex-col gap-3">
            <div>
              <p className="text-[12px] font-black" style={{ color: ink }}>
                Brand images
              </p>
              <p className="text-[10px] mt-0.5 mb-3" style={{ color: muted }}>
                Update what customers see across fajify.
              </p>
              <label className="block cursor-pointer">
                <span
                  className="block text-[10px] font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: muted }}
                >
                  Cover photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) =>
                    updateBusinessImage("cover", event.target.files?.[0])
                  }
                />
                <div className="relative h-32 rounded-[16px] overflow-hidden">
                  <img
                    src={coverFor(biz)}
                    alt={`${biz.name} cover`}
                    className="h-full w-full object-cover"
                  />
                  <div
                    className="absolute inset-0 flex items-end p-3"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(0,0,0,.65), transparent)",
                    }}
                  >
                    <span className="rounded-full px-3 py-1.5 text-[10px] font-black text-white bg-black/40 backdrop-blur-sm">
                      Change cover photo
                    </span>
                  </div>
                </div>
              </label>
              <div className="flex items-center gap-3 mt-4">
                <label className="cursor-pointer shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) =>
                      updateBusinessImage("logo", event.target.files?.[0])
                    }
                  />
                  <div
                    className="h-20 w-20 rounded-[20px] overflow-hidden flex items-center justify-center text-white text-[24px] font-black relative"
                    style={{ background: ACCENT }}
                  >
                    {logoFor(biz) ? (
                      <img
                        src={logoFor(biz)}
                        alt={`${biz.name} logo`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      biz.initial
                    )}
                    <div className="absolute inset-x-0 bottom-0 py-1 text-center text-[8px] font-black bg-black/55">
                      CHANGE
                    </div>
                  </div>
                </label>
                <div>
                  <p className="text-[12px] font-black" style={{ color: ink }}>
                    Profile logo
                  </p>
                  <p
                    className="text-[10px] mt-1 leading-relaxed"
                    style={{ color: muted }}
                  >
                    Use a square logo or clear profile image. PNG or JPG works
                    best.
                  </p>
                </div>
              </div>
            </div>
            <div className="h-px my-1" style={{ background: border }} />
            <div>
              <p className="text-[12px] font-black" style={{ color: ink }}>
                Gallery photos
              </p>
              <p className="text-[10px] mt-0.5 mb-3" style={{ color: muted }}>
                Show customers the venue and experience.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {allPhotos.map((p) => (
                <div
                  key={p.i}
                  className="relative rounded-[12px] overflow-hidden"
                  style={{ aspectRatio: "1", background: subBg }}
                >
                  <img
                    src={p.src}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                  <button
                    onClick={() => setDeletedPhotos((d) => [...d, p.i])}
                    className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.55)" }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      stroke="white"
                      strokeWidth="2.5"
                      fill="none"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  setPhotoAdded(true)
                  setTimeout(() => setPhotoAdded(false), 1500)
                }}
                className="rounded-[12px] flex flex-col items-center justify-center gap-1"
                style={{
                  aspectRatio: "1",
                  background: subBg,
                  border: `2px dashed ${border}`,
                }}
              >
                {photoAdded ? (
                  <span className="text-[18px]">✓</span>
                ) : (
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={muted}
                    strokeWidth="1.8"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                )}
                <p className="text-[9px] font-bold" style={{ color: muted }}>
                  {photoAdded ? "Added!" : "Add photo"}
                </p>
              </button>
            </div>
            <p className="text-[11px] text-center" style={{ color: muted }}>
              {allPhotos.length} photos · Tap × to remove
            </p>
          </div>
        )
      },
    },
    "Opening Hours": {
      title: "Opening Hours",
      body: () => (
        <div className="flex flex-col">
          {[
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ].map((day) => {
            const defaultClosed = day === "Monday"
            const open =
              hoursEdited[day] !== undefined
                ? !hoursEdited[day]
                : !defaultClosed
            return (
              <div
                key={day}
                className="flex items-center justify-between px-4 py-3.5"
                style={{ borderBottom: `1px solid ${border}` }}
              >
                <div>
                  <p
                    className="text-[13px] font-semibold"
                    style={{ color: ink }}
                  >
                    {day}
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: open ? muted : "#EF4444" }}
                  >
                    {open ? "12:00 PM – 11:00 PM" : "Closed"}
                  </p>
                </div>
                <button
                  onClick={() => setHoursEdited((p) => ({ ...p, [day]: open }))}
                  className="relative h-6 rounded-full shrink-0"
                  style={{
                    background: open ? ACCENT : dark ? "#333" : "#DDD",
                    width: 44,
                  }}
                >
                  <div
                    className="absolute top-1 h-4 w-4 rounded-full bg-white shadow"
                    style={{
                      left: open ? "24px" : "4px",
                      transition: "left 0.15s",
                    }}
                  />
                </button>
              </div>
            )
          })}
        </div>
      ),
    },
    "Location & Contact": {
      title: "Location & Contact",
      body: () => {
        const cf = contactFields
        const setCF =
          (k: keyof typeof contactFields) =>
          (e: React.ChangeEvent<HTMLInputElement>) =>
            setContactFields((p) => ({ ...p, [k]: e.target.value }))
        return (
          <div className="flex flex-col">
            {[
              {
                label: "Address",
                key: "address" as const,
                placeholder: "14 Kofo Abayomi St, Victoria Island",
                type: "text",
              },
              {
                label: "Phone",
                key: "phone" as const,
                placeholder: "+234 818 000 1234",
                type: "tel",
              },
              {
                label: "Email",
                key: "email" as const,
                placeholder:
                  "hello@" + biz.name.toLowerCase().replace(/\s/g, "") + ".ng",
                type: "email",
              },
              {
                label: "Instagram",
                key: "instagram" as const,
                placeholder: "@" + biz.name.toLowerCase().replace(/\s/g, ""),
                type: "text",
              },
            ].map((f) => (
              <div
                key={f.key}
                className="px-4 py-3"
                style={{ borderBottom: `1px solid ${border}` }}
              >
                <p
                  className="text-[10px] font-black uppercase tracking-wider mb-1"
                  style={{ color: muted }}
                >
                  {f.label}
                </p>
                <input
                  type={f.type}
                  aria-label={f.label} value={cf[f.key]}
                  onChange={setCF(f.key)}
                  placeholder={f.placeholder}
                  className="w-full text-[14px] font-semibold outline-none bg-transparent"
                  style={{ color: ink }}
                />
              </div>
            ))}
            <div
              className="px-4 py-3"
              style={{ borderBottom: `1px solid ${border}` }}
            >
              <p
                className="text-[10px] font-black uppercase tracking-wider mb-1"
                style={{ color: muted }}
              >
                Google Maps
              </p>
              <p className="text-[13px] font-bold" style={{ color: "#22c55e" }}>
                Verified location ✓
              </p>
            </div>
            <div className="px-4 py-4">
              <button
                onClick={() => {
                  setContactSaved(true)
                  setTimeout(() => setContactSaved(false), 2000)
                }}
                className="w-full rounded-[14px] py-3.5 text-[13px] font-black text-white"
                style={{ background: contactSaved ? "#22c55e" : ACCENT }}
              >
                {contactSaved ? "✓ Saved" : "Save Changes"}
              </button>
            </div>
          </div>
        )
      },
    },
    "Staff & Access": {
      title: "Staff & Access",
      body: () => {
        const members = [
          { name: "Adaeze Okonkwo", role: "Manager" },
          { name: "Emeka Eze", role: "Supervisor" },
          { name: "Chisom Bello", role: "Cashier" },
          { name: "Tunde Fashola", role: "Floor Staff" },
        ]
        return (
          <div className="flex flex-col">
            {[...members, ...(invitedStaff[biz.id] ?? [])].map((s, i) => {
              const active = staffStatuses[`${biz.id}:${s.name}`] ?? true
              return (
                <div
                  key={s.name}
                  className="flex items-center gap-3 px-4 py-3.5"
                  style={{ borderBottom: `1px solid ${border}` }}
                >
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white font-black shrink-0"
                    style={{ background: ACCENT }}
                  >
                    {s.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-bold" style={{ color: ink }}>
                      {s.name}
                    </p>
                    <p className="text-[11px]" style={{ color: muted }}>
                      {s.role}
                    </p>
                  </div>
                  <button role="switch" aria-label={`Access for ${s.name}`} aria-checked={active}
                    onClick={() =>
                      setStaffStatuses((p) => ({ ...p, [`${biz.id}:${s.name}`]: !active }))
                    }
                    className="relative h-6 rounded-full shrink-0"
                    style={{
                      background: active ? ACCENT : dark ? "#333" : "#DDD",
                      width: 44,
                    }}
                  >
                    <div
                      className="absolute top-1 h-4 w-4 rounded-full bg-white shadow"
                      style={{
                        left: active ? "24px" : "4px",
                        transition: "left 0.15s",
                      }}
                    />
                  </button>
                </div>
              )
            })}
            <div className="px-4 py-4">
              <button onClick={() => setStaffInviteOpen(true)}
                className="w-full rounded-[14px] py-3.5 text-[13px] font-black text-white"
                style={{ background: ACCENT }}
              >
                + Invite Staff Member
              </button>
            </div>
            {staffInviteOpen && <form className="p-4 space-y-3" onSubmit={event => { event.preventDefault(); if (!inviteName.trim()) return; setInvitedStaff(previous => ({...previous, [biz.id]: [...(previous[biz.id] ?? []), {name: inviteName.trim(), role: inviteRole}]})); setInviteName(''); setStaffInviteOpen(false) }}>
              <p className="text-sm">Demo invitation · No email is sent</p>
              <label className="block text-sm">Staff name<input className="mt-2 w-full rounded-xl border p-3" value={inviteName} required onChange={event => setInviteName(event.target.value)} /></label>
              <label className="block text-sm">Role<select className="mt-2 w-full rounded-xl border p-3" value={inviteRole} onChange={event => setInviteRole(event.target.value)}>{['Manager','Supervisor','Cashier','Floor Staff'].map(role => <option key={role}>{role}</option>)}</select></label>
              <button type="submit" className="rounded-full px-5 py-3 text-sm text-white" style={{background: ACCENT}}>Add demo staff</button>
              <button type="button" className="px-5 py-3 text-sm" onClick={() => setStaffInviteOpen(false)}>Cancel</button>
            </form>}
          </div>
        )
      },
    },
    "Payouts & Bank": {
      title: "Payouts & Bank",
      body: () => {
        const available = 320000
        const enteredAmount = Number(customPayoutAmount.replace(/\D/g, "")) || 0
        const requestedAmount =
          payoutMode === "all" ? available : Math.min(enteredAmount, available)
        const commission = Math.round(requestedAmount * 0.12)
        const transferFee = 50
        const net = Math.max(0, requestedAmount - commission - transferFee)

        if (payoutStage === "submitted") {
          return (
            <div className="p-5 text-center">
              <div
                className="mx-auto h-14 w-14 rounded-full flex items-center justify-center mb-3"
                style={{ background: "#22c55e18", color: "#22c55e" }}
              >
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </div>
              <p className="text-[17px] font-black" style={{ color: ink }}>
                Payout requested
              </p>
              <p
                className="text-[12px] mt-1 leading-relaxed"
                style={{ color: muted }}
              >
                Demo only: {fmt(net)} would be sent to {bankDetails.bank}, ending{" "}
                {bankDetails.accountNumber.slice(-4)}.
              </p>
              {requestedAmount < available && (
                <p className="text-[10px] mt-1" style={{ color: muted }}>
                  {fmt(available - requestedAmount)} remains in your fajify
                  balance.
                </p>
              )}
              <div
                className="rounded-[14px] p-4 mt-4 text-left"
                style={{ background: subBg }}
              >
                <div className="flex justify-between mb-2">
                  <p className="text-[11px]" style={{ color: muted }}>
                    Status
                  </p>
                  <p
                    className="text-[11px] font-black"
                    style={{ color: AMBER }}
                  >
                    Processing
                  </p>
                </div>
                <div className="flex justify-between mb-2">
                  <p className="text-[11px]" style={{ color: muted }}>
                    Expected arrival
                  </p>
                  <p className="text-[11px] font-black" style={{ color: ink }}>
                    Today, by 6:00 PM
                  </p>
                </div>
                <div className="flex justify-between">
                  <p className="text-[11px]" style={{ color: muted }}>
                    Reference
                  </p>
                  <p className="text-[11px] font-black" style={{ color: ink }}>
                    FJ-PY-083026
                  </p>
                </div>
              </div>
              <p
                className="text-[11px] mt-3 leading-relaxed"
                style={{ color: muted }}
              >
                We will notify you when your bank confirms the transfer.
              </p>
              <button
                onClick={() => {
                  setPayoutStage("idle")
                  setPayoutConfirmed(true)
                  setPayoutScreenOpen(false)
                }}
                className="w-full mt-4 rounded-[14px] py-3.5 text-[13px] font-black text-white"
                style={{ background: ACCENT }}
              >
                Done
              </button>
            </div>
          )
        }

        if (payoutStage === "review") {
          return (
            <div className="p-4">
              <p className="text-[16px] font-black" style={{ color: ink }}>
                Confirm withdrawal
              </p>
              <p
                className="text-[10px] mt-1 mb-4 leading-relaxed"
                style={{ color: muted }}
              >
                Check the amount and destination below. This is a local simulation. No money is sent when
                you tap Confirm withdrawal.
              </p>
              <div
                className="rounded-[16px] p-4 mb-4"
                style={{ background: subBg }}
              >
                <p
                  className="text-[10px] font-black uppercase tracking-wider"
                  style={{ color: muted }}
                >
                  You will receive
                </p>
                <p
                  className="text-[26px] font-black mt-1"
                  style={{ color: ink }}
                >
                  {fmt(net)}
                </p>
                <p className="text-[11px] mt-1" style={{ color: muted }}>
                  Usually arrives within a few hours
                </p>
              </div>
              {[
                ["Withdrawal amount", fmt(requestedAmount)],
                ["fajify commission (12%)", `−${fmt(commission)}`],
                ["Bank transfer fee", `−${fmt(transferFee)}`],
                [
                  "Destination",
                  `${bankDetails.bank} • ${bankDetails.accountNumber.slice(-4)}`,
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-4 py-3"
                  style={{ borderBottom: `1px solid ${border}` }}
                >
                  <p className="text-[11px]" style={{ color: muted }}>
                    {label}
                  </p>
                  <p
                    className="text-[11px] font-black text-right"
                    style={{ color: ink }}
                  >
                    {value}
                  </p>
                </div>
              ))}
              <div
                className="rounded-[12px] p-3 mt-4 flex gap-2.5"
                style={{ background: AMBER + "12" }}
              >
                <span
                  className="text-[13px] font-black"
                  style={{ color: AMBER }}
                >
                  i
                </span>
                <p
                  className="text-[10px] leading-relaxed"
                  style={{ color: muted }}
                >
                  By confirming, you authorize fajify to deduct the service fee
                  from this settlement. You never need to pay commission
                  separately.
                </p>
              </div>
              <button
                onClick={() => setPayoutStage("submitted")}
                className="w-full mt-4 rounded-[14px] py-3.5 text-[13px] font-black text-white"
                style={{ background: ACCENT }}
              >
                Confirm withdrawal
              </button>
              <button
                onClick={() => setPayoutStage("idle")}
                className="w-full mt-2 rounded-[14px] py-3 text-[12px] font-black"
                style={{ color: muted }}
              >
                Not now
              </button>
            </div>
          )
        }

        return (
          <div>
            <div
              className="p-4"
              style={{ borderBottom: `1px solid ${border}` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p
                    className="text-[10px] font-black uppercase tracking-wider"
                    style={{ color: muted }}
                  >
                    Available to withdraw
                  </p>
                  <p
                    className="text-[25px] font-black mt-1"
                    style={{ color: ink }}
                  >
                    {fmt(available)}
                  </p>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-black"
                  style={{ background: "#22c55e18", color: "#22c55e" }}
                >
                  Available now
                </span>
              </div>
              <div
                className="rounded-[12px] p-3 mt-3"
                style={{ background: subBg }}
              >
                <p className="text-[11px] font-black" style={{ color: ink }}>
                  Upcoming: ₦86,400
                </p>
                <p
                  className="text-[10px] mt-1 leading-relaxed"
                  style={{ color: muted }}
                >
                  Reservations release after completion. Event ticket funds
                  release after the event date.
                </p>
              </div>
              <div className="mt-4">
                <p
                  className="text-[10px] font-bold uppercase tracking-wider mb-2"
                  style={{ color: muted }}
                >
                  How much do you want to withdraw?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      id: "all" as const,
                      label: "Withdraw all",
                      sub: fmt(available),
                    },
                    {
                      id: "custom" as const,
                      label: "Enter amount",
                      sub: "Choose an amount",
                    },
                  ].map((option) => {
                    const active = payoutMode === option.id
                    return (
                      <button
                        key={option.id}
                        onClick={() => setPayoutMode(option.id)}
                        className="rounded-[13px] p-3 text-left"
                        style={{
                          background: active ? ACCENT + "10" : subBg,
                          border: `1.5px solid ${active ? ACCENT : border}`,
                        }}
                      >
                        <p
                          className="text-[11px] font-black"
                          style={{ color: active ? ACCENT : ink }}
                        >
                          {option.label}
                        </p>
                        <p
                          className="text-[9px] mt-0.5"
                          style={{ color: muted }}
                        >
                          {option.sub}
                        </p>
                      </button>
                    )
                  })}
                </div>
                {payoutMode === "custom" && (
                  <label className="block mt-3">
                    <span
                      className="block text-[10px] font-bold uppercase tracking-wider mb-1.5"
                      style={{ color: muted }}
                    >
                      Withdrawal amount
                    </span>
                    <div
                      className="flex items-center rounded-[13px] border overflow-hidden"
                      style={fieldStyle}
                    >
                      <span
                        className="pl-3 text-[15px] font-black"
                        style={{ color: ink }}
                      >
                        ₦
                      </span>
                      <input
                        inputMode="numeric"
                        aria-label="Withdrawal amount" value={customPayoutAmount}
                        onChange={(event) =>
                          setCustomPayoutAmount(
                            event.target.value.replace(/\D/g, ""),
                          )
                        }
                        className="min-w-0 flex-1 px-2 py-3 text-[14px] font-black outline-none bg-transparent"
                        style={{ color: ink }}
                      />
                    </div>
                    {enteredAmount > available && (
                      <span
                        className="block text-[9px] font-bold mt-1.5"
                        style={{ color: "#EF4444" }}
                      >
                        Amount cannot exceed your available balance.
                      </span>
                    )}
                    {enteredAmount > 0 && enteredAmount <= available && (
                      <span
                        className="block text-[9px] mt-1.5"
                        style={{ color: muted }}
                      >
                        {fmt(available - enteredAmount)} will remain in your
                        fajify balance.
                      </span>
                    )}
                  </label>
                )}
              </div>
            </div>

            <div
              className="p-4"
              style={{ borderBottom: `1px solid ${border}` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[13px] font-black" style={{ color: ink }}>
                    Settlement account
                  </p>
                  <p
                    className="text-[10px] mt-0.5"
                    style={{ color: bankSaved ? "#22c55e" : AMBER }}
                  >
                    {bankSaved ? "Verified account" : "Save to verify changes"}
                  </p>
                </div>
                <span
                  className="text-[10px] font-black"
                  style={{ color: ACCENT }}
                >
                  NGN
                </span>
              </div>
              <label className="block mb-3">
                <span
                  className="block text-[10px] font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: muted }}
                >
                  Bank
                </span>
                <select
                  aria-label="Bank" value={bankDetails.bank}
                  onChange={(e) => {
                    setBankDetails((p) => ({ ...p, bank: e.target.value }))
                    setBankSaved(false)
                  }}
                  className="w-full rounded-[13px] px-3 py-3 text-[13px] font-semibold outline-none border"
                  style={fieldStyle}
                >
                  {NIGERIAN_BANKS.map((bank) => (
                    <option key={bank}>{bank}</option>
                  ))}
                </select>
              </label>
              <label className="block mb-3">
                <span
                  className="block text-[10px] font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: muted }}
                >
                  Account number
                </span>
                <input
                  inputMode="numeric"
                  maxLength={10}
                  aria-label="Account number" value={bankDetails.accountNumber}
                  onChange={(e) => {
                    setBankDetails((p) => ({
                      ...p,
                      accountNumber: e.target.value.replace(/\D/g, ""),
                    }))
                    setBankSaved(false)
                  }}
                  className="w-full rounded-[13px] px-3 py-3 text-[13px] font-semibold outline-none border"
                  style={fieldStyle}
                />
              </label>
              <label className="block">
                <span
                  className="block text-[10px] font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: muted }}
                >
                  Account name
                </span>
                <input
                  aria-label="Account name" value={bankDetails.accountName}
                  onChange={(e) => {
                    setBankDetails((p) => ({
                      ...p,
                      accountName: e.target.value,
                    }))
                    setBankSaved(false)
                  }}
                  className="w-full rounded-[13px] px-3 py-3 text-[13px] font-semibold outline-none border"
                  style={fieldStyle}
                />
              </label>
              <button
                disabled={bankDetails.accountNumber.length !== 10}
                onClick={() => setBankSaved(true)}
                className="w-full mt-3 rounded-[13px] py-3 text-[12px] font-black text-white disabled:opacity-40"
                style={{ background: bankSaved ? "#22c55e" : ACCENT }}
              >
                {bankSaved ? "Account verified ✓" : "Save and verify account"}
              </button>
            </div>

            <div className="p-4">
              <p className="text-[12px] font-black" style={{ color: ink }}>
                How fajify settlements work
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {[
                  [
                    "Food & fulfilled orders",
                    "Available after completion and a short refund hold",
                  ],
                  [
                    "Reservations",
                    "Available after the guest visit is completed",
                  ],
                  ["Events & tickets", "Available after the event date"],
                ].map(([title, copy]) => (
                  <div key={title} className="flex gap-2.5">
                    <div
                      className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black"
                      style={{ background: ACCENT + "14", color: ACCENT }}
                    >
                      ✓
                    </div>
                    <div>
                      <p
                        className="text-[10px] font-black"
                        style={{ color: ink }}
                      >
                        {title}
                      </p>
                      <p
                        className="text-[9px] leading-relaxed"
                        style={{ color: muted }}
                      >
                        {copy}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                disabled={
                  !bankSaved ||
                  requestedAmount <= 50 ||
                  (payoutMode === "custom" && enteredAmount > available)
                }
                onClick={() => setPayoutStage("review")}
                className="w-full mt-4 rounded-[14px] py-3.5 text-[13px] font-black text-white disabled:opacity-40"
                style={{ background: ACCENT }}
              >
                Continue
              </button>
              <p
                className="text-[9px] text-center mt-2"
                style={{ color: muted }}
              >
                You will confirm the final amount on the next screen.
              </p>
            </div>
          </div>
        )
      },
    },
    "Help & Support": {
      title: "Help & Support",
      body: () => (
        <div className="flex flex-col gap-2">
          {[
            {
              label: "Call Business Support",
              sub: "Available 8am – 10pm",
              icon: "📞",
              action: "call",
            },
            {
              label: "WhatsApp Support",
              sub: "+234 901 234 5678",
              icon: "💬",
              action: "whatsapp",
            },
            {
              label: "Email Support",
              sub: "business@fajify.ng",
              icon: "✉️",
              action: "email",
            },
            {
              label: "View FAQ",
              sub: "Common questions",
              icon: "❓",
              action: "faq",
            },
            {
              label: "App Version",
              sub: "3.4.1 (current)",
              icon: "ℹ️",
              action: "none",
            },
          ].map((item, i, arr) => (
            <button
              key={item.label}
              onClick={() => setSupportMessage(`${item.label} is a simulation. No call, message or email is sent.`)}
              className="flex items-center gap-3 w-full px-4 py-3.5 text-left"
              style={{
                background: surface,
                borderBottom:
                  i < arr.length - 1 ? `1px solid ${border}` : "none",
              }}
            >
              <span className="text-[20px] shrink-0">{item.icon}</span>
              <div className="flex-1">
                <p className="text-[13px] font-semibold" style={{ color: ink }}>
                  {item.label}
                </p>
                <p className="text-[11px]" style={{ color: muted }}>
                  {item.sub}
                </p>
              </div>
              {item.action !== "none" && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={muted}
                  strokeWidth="2"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              )}
            </button>
          ))}
        </div>
      ),
    },
  }

  const renderSettings = () => (
    <div className="vendor-modal-overlay fixed inset-0 z-50 flex flex-col justify-end max-w-[430px] mx-auto">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"
        onClick={() => {
          setSettingsOpen(false)
          setSettingDetail(null)
          setPayoutConfirmed(false)
        }}
      />
      <div
        className="vendor-modal-panel relative rounded-t-[28px] overflow-hidden"
        style={{ background: surface, zIndex: 1 }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div
            className="h-1 w-10 rounded-full"
            style={{ background: dark ? "#444" : "#DDD" }}
          />
        </div>
        <div className="px-5 pb-2 flex items-center justify-between">
          {settingDetail ? (
            <button
              onClick={() => setSettingDetail(null)}
              className="flex items-center gap-2"
              style={{ color: ACCENT }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={ACCENT}
                strokeWidth="2.5"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <p className="text-[18px] font-black" style={{ color: ink }}>
                {settingDetail}
              </p>
            </button>
          ) : (
            <p className="text-[18px] font-black" style={{ color: ink }}>
              Settings
            </p>
          )}
          <button
            onClick={() => {
              setSettingsOpen(false)
              setSettingDetail(null)
              setPayoutConfirmed(false)
            }}
            className="h-8 w-8 rounded-full flex items-center justify-center"
            style={{ background: subBg }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              stroke={muted}
              strokeWidth="2.5"
              fill="none"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {settingDetail ? (
          <div className="px-5 pb-10 overflow-y-auto max-h-[70vh] [scrollbar-width:none]">
            <div
              className="rounded-[18px] overflow-hidden"
              style={{ border: `1px solid ${border}` }}
            >
              {SETTING_CONTENT[settingDetail]?.body()}
            </div>
          </div>
        ) : (
          <div className="px-5 pb-10 flex flex-col gap-3">
            {/* Revenue + payout */}
            <div
              className="rounded-[18px] p-4"
              style={{ background: subBg, border: `1px solid ${border}` }}
            >
              <p className="text-[13px] font-black mb-3" style={{ color: ink }}>
                Revenue Summary
              </p>
              {[
                { l: "Total this month", v: biz.weekTotal },
                { l: "Pending payout", v: "₦320,000" },
                { l: "Completed payouts", v: "₦1,820,000" },
              ].map((r) => (
                <div
                  key={r.l}
                  className="flex justify-between items-center py-2.5"
                  style={{ borderBottom: `1px solid ${border}` }}
                >
                  <p className="text-[11px]" style={{ color: muted }}>
                    {r.l}
                  </p>
                  <p className="text-[13px] font-black" style={{ color: ink }}>
                    {r.v}
                  </p>
                </div>
              ))}
              <button
                onClick={() => setSettingDetail("Payouts & Bank")}
                className="w-full mt-3 rounded-[12px] py-3 text-[13px] font-black text-white"
                style={{ background: payoutConfirmed ? "#22c55e" : ACCENT }}
              >
                Manage payouts
              </button>
            </div>
            {/* Settings list */}
            <div
              className="rounded-[18px] overflow-hidden"
              style={{ border: `1px solid ${border}` }}
            >
              {([
                "Business Profile",
                "Photos & Gallery",
                "Opening Hours",
                "Location & Contact",
                "Staff & Access",
                "Help & Support",
              ] as const).map((item, i, arr) => (
                <button
                  key={item}
                  onClick={() => setSettingDetail(item)}
                  className="flex items-center justify-between w-full px-4 py-3.5"
                  style={{
                    background: surface,
                    borderBottom:
                      i < arr.length - 1 ? `1px solid ${border}` : "none",
                  }}
                >
                  <p
                    className="text-[13px] font-semibold"
                    style={{ color: ink }}
                  >
                    {item}
                  </p>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={muted}
                    strokeWidth="2"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const closeAddItem = () => {
    const sy = tab4ScrollRef.current?.scrollTop ?? 0
    setAddItemOpen(false)
    requestAnimationFrame(() => {
      if (tab4ScrollRef.current) tab4ScrollRef.current.scrollTop = sy
    })
  }

  const renderAddItem = () => (
    <div className="vendor-modal-overlay fixed inset-0 z-50 flex flex-col justify-end max-w-[430px] mx-auto">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"
        onClick={closeAddItem}
      />
      <div
        className="vendor-modal-panel relative rounded-t-[28px] overflow-hidden"
        style={{ background: surface, zIndex: 1 }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div
            className="h-1 w-10 rounded-full"
            style={{ background: dark ? "#444" : "#DDD" }}
          />
        </div>
        <div className="px-5 pb-2 flex items-center justify-between">
          <p className="text-[18px] font-black" style={{ color: ink }}>
            Add {biz.tabs[3].replace(/s$/, "")}
          </p>
          <button aria-label="Close item editor"
            onClick={closeAddItem}
            className="h-8 w-8 rounded-full flex items-center justify-center"
            style={{ background: subBg }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              stroke={muted}
              strokeWidth="2.5"
              fill="none"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="px-5 pb-10 flex flex-col gap-3 max-h-[80vh] overflow-y-auto [scrollbar-width:none]">
          {/* Image upload section */}
          <div>
            <p
              className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
              style={{ color: muted }}
            >
              Item Photo
            </p>
            <label className="block cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setNewItemImg(URL.createObjectURL(file))
                }}
              />
              <div
                className="w-full h-36 rounded-[16px] overflow-hidden flex items-center justify-center"
                style={{
                  background: subBg,
                  border: `2px dashed ${newItemImg ? "transparent" : border}`,
                }}
              >
                {newItemImg ? (
                  <img
                    src={newItemImg}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="h-10 w-10 rounded-[12px] flex items-center justify-center"
                      style={{ background: ACCENT + "18" }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={ACCENT}
                        strokeWidth="2"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                    <p
                      className="text-[12px] font-semibold"
                      style={{ color: ACCENT }}
                    >
                      Tap to upload photo
                    </p>
                    <p className="text-[10px]" style={{ color: muted }}>
                      JPG, PNG — max 5MB
                    </p>
                  </div>
                )}
              </div>
            </label>
            {newItemImg && (
              <button
                onClick={() => setNewItemImg("")}
                className="mt-1.5 text-[11px] font-semibold"
                style={{ color: muted }}
              >
                Remove photo
              </button>
            )}
          </div>
          <div>
            <p
              className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
              style={{ color: muted }}
            >
              Name
            </p>
            <input
              aria-label="Item name" value={newItemName}
              onChange={(event) => setNewItemName(event.target.value)}
              placeholder="e.g. Grilled Snapper"
              className="w-full rounded-[13px] px-4 py-3 text-[14px] outline-none border"
              style={{ background: subBg, borderColor: border, color: ink }}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: muted }}
              >
                Category
              </p>
              <button
                onClick={() => setCreatingCategory((value) => !value)}
                className="text-[10px] font-black"
                style={{ color: ACCENT }}
              >
                {creatingCategory ? "Cancel" : "+ Create category"}
              </button>
            </div>
            {creatingCategory ? (
              <div className="flex gap-2">
                <input
                  aria-label="New category name" value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="e.g. Chef Specials"
                  className="min-w-0 flex-1 rounded-[13px] px-4 py-3 text-[13px] outline-none border"
                  style={{ background: subBg, borderColor: border, color: ink }}
                />
                <button
                  disabled={!newCategoryName.trim()}
                  onClick={() => {
                    const category = newCategoryName.trim()
                    if (!category) return
                    setCustomCategories((current) => ({
                      ...current,
                      [biz.id]: Array.from(
                        new Set([...(current[biz.id] ?? []), category]),
                      ),
                    }))
                    setNewItemCat(category)
                    setNewCategoryName("")
                    setCreatingCategory(false)
                  }}
                  className="rounded-[13px] px-4 text-[11px] font-black text-white disabled:opacity-40"
                  style={{ background: ACCENT }}
                >
                  Add
                </button>
              </div>
            ) : (
              <select
                aria-label="Item category" value={newItemCat}
                onChange={(event) => setNewItemCat(event.target.value)}
                className="w-full rounded-[13px] px-4 py-3 text-[13px] font-semibold outline-none border"
                style={{ background: subBg, borderColor: border, color: ink }}
              >
                <option value="">Select a category</option>
                {menuCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <p
              className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
              style={{ color: muted }}
            >
              Price
            </p>
            <div
              className="flex items-center rounded-[13px] border overflow-hidden"
              style={{ background: subBg, borderColor: border }}
            >
              <span
                className="pl-4 text-[15px] font-black"
                style={{ color: ink }}
              >
                ₦
              </span>
              <input
                inputMode="numeric"
                aria-label="Price" value={newItemPrice}
                onChange={(event) =>
                  setNewItemPrice(
                    event.target.value.replace(/\D/g, "").slice(0, 9),
                  )
                }
                placeholder="0"
                className="min-w-0 flex-1 px-2 py-3 text-[14px] font-black outline-none bg-transparent"
                style={{ color: ink }}
              />
              {Number(newItemPrice) > 0 && (
                <span
                  className="pr-4 text-[10px] font-bold"
                  style={{ color: muted }}
                >
                  {fmt(Number(newItemPrice))}
                </span>
              )}
            </div>
            <p className="text-[9px] mt-1.5" style={{ color: muted }}>
              Enter the customer-facing price in Nigerian Naira.
            </p>
          </div>
          <button
            disabled={
              !newItemName.trim() || !newItemCat || Number(newItemPrice) <= 0
            }
            onClick={() => {
              const item: Product = {
                id: `custom-${Date.now()}`,
                name: newItemName.trim(),
                cat: newItemCat,
                price: Number(newItemPrice),
                available: true,
                image: newItemImg || coverFor(biz),
              }
              setCustomProducts((current) => ({
                ...current,
                [biz.id]: [...(current[biz.id] ?? []), item],
              }))
              setNewItemName("")
              setNewItemPrice("")
              setNewItemCat("")
              setNewItemImg("")
              closeAddItem()
            }}
            className="w-full rounded-[16px] py-3.5 text-[14px] font-black text-white mt-2 disabled:opacity-40"
            style={{ background: ACCENT }}
          >
            Save Item
          </button>
        </div>
      </div>
    </div>
  )

  const renderBizPicker = () => (
    <div ref={businessPickerRef} role="dialog" aria-modal="true" aria-label="Switch business" className="vendor-modal-overlay fixed inset-0 z-50 flex flex-col justify-end max-w-[430px] mx-auto">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
        aria-label="Close business switcher" onClick={() => setBizPickerOpen(false)}
      />
      <div
        className="vendor-modal-panel relative rounded-t-[28px] overflow-hidden"
        style={{ background: surface, zIndex: 1 }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div
            className="h-1 w-10 rounded-full"
            style={{ background: dark ? "#444" : "#DDD" }}
          />
        </div>
        <div className="px-5 pb-2 flex items-center justify-between">
          <p className="text-[18px] font-black" style={{ color: ink }}>
            Switch Business
          </p>
          <button
            aria-label="Close business switcher" onClick={() => setBizPickerOpen(false)}
            className="h-8 w-8 rounded-full flex items-center justify-center"
            style={{ background: subBg }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              stroke={muted}
              strokeWidth="2.5"
              fill="none"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <p className="px-5 text-[12px] mb-3" style={{ color: muted }}>
          Each business has its own tailored dashboard
        </p>
        <div className="px-4 pb-10 flex flex-col gap-2.5 max-h-[70vh] overflow-y-auto [scrollbar-width:none]">
          {BUSINESSES.map((b) => {
            const active = biz.id === b.id
            return (
              <button
                key={b.id}
                onClick={() => {
                  setBiz(b)
                  setPayoutStage("idle")
                  setSelectedOrderId(null)
                  setStaffInviteOpen(false)
                  setSupportMessage('')
                  setTab("overview")
                  setBizPickerOpen(false)
                }}
                className="flex items-center gap-3 rounded-[18px] p-3 w-full text-left"
                style={{
                  background: active ? b.accent + "10" : subBg,
                  border: `2px solid ${active ? b.accent : "transparent"}`,
                }}
              >
                <div className="h-14 w-20 rounded-[12px] overflow-hidden shrink-0 relative">
                  <img
                    src={coverFor(b)}
                    alt={b.name}
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: "rgba(0,0,0,0.25)" }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[14px] font-black truncate"
                    style={{ color: active ? b.accent : ink }}
                  >
                    {b.name}
                  </p>
                  <p className="text-[11px] truncate" style={{ color: muted }}>
                    {b.type}
                  </p>
                  <p
                    className="text-[12px] font-bold mt-0.5"
                    style={{ color: active ? b.accent : muted }}
                  >
                    {b.stats[0].val} today
                  </p>
                </div>
                <div
                  className="h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: active ? b.accent : border }}
                >
                  {active && (
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ background: b.accent }}
                    />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  // ── Settings full screen ─────────────────────────────────────────────────────

  if (payoutScreenOpen) {
    return (
      <div
        className="min-h-screen w-full font-[family-name:var(--font-ui)] md:pl-24"
        style={{ background: bg }}
      >
        <div
          className="flex items-center gap-3 sticky top-0 z-10 px-5 pt-14 pb-4"
          style={{ background: bg }}
        >
          <button
            onClick={() => setPayoutScreenOpen(false)}
            className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: surface, border: `1px solid ${border}` }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={ink}
              strokeWidth="2.5"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div>
            <p
              className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: ACCENT }}
            >
              {biz.name}
            </p>
            <p
              className="text-[20px] font-black leading-tight"
              style={{ color: ink }}
            >
              Withdraw
            </p>
          </div>
        </div>
        <div
          className="overflow-y-auto [scrollbar-width:none] pb-16"
          style={{ height: "calc(100vh - 100px)" }}
        >
          <div
            className="mx-5 rounded-[20px] overflow-hidden"
            style={{ background: surface, border: `1px solid ${border}` }}
          >
            {SETTING_CONTENT["Payouts & Bank"].body()}
          </div>
        </div>
      </div>
    )
  }

  if (settingsScreen) return <BusinessSettings businessName={biz.name} palette={{bg,surface,ink,muted,border,accent:ACCENT}} detailTitle={settingsScreen==='main'?undefined:settingsScreen} onBack={()=>setSettingsScreen(settingsScreen==='main'?null:'main')} onSelect={setSettingsScreen}>{settingsScreen!=='main'&&<>{SETTING_CONTENT[settingsScreen]?.body()}{supportMessage&&<p role="status" className="p-4 text-sm">{supportMessage}</p>}</>}</BusinessSettings>;

  // ── Render ────────────────────────────────────────────────────────────────────

  const TAB_IDS: TabId[] = ["overview", "tab2", "tab3", "tab4", "services"]
  const visibleTabIds = TAB_IDS.filter((id) => {
    if (id === "tab2") return serviceEnabled.reservations
    if (id === "tab3") return serviceEnabled.ordering
    return true
  })
  const tabLabel = (id: TabId) => {
    if (id === "overview") return "Home"
    if (id === "services") return "Services"
    return biz.tabs[TAB_IDS.indexOf(id)]
  }

  return (
    <div
      className="vendor-dashboard-main min-h-screen w-full pb-24 font-[family-name:var(--font-ui)] md:pl-24"
      style={{ background: bg }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between sticky top-0 z-10 px-5 pt-12 pb-3 md:px-10 md:pt-7 md:pb-5 lg:px-16"
        style={{ background: surface, borderBottom: `1px solid ${border}` }}
      >
        <button aria-label={`Switch business: ${biz.name}`}
          className="flex items-center gap-3"
          onClick={() => setBizPickerOpen(true)}
        >
          <div
            className="h-10 w-10 rounded-[12px] flex items-center justify-center text-[16px] font-black text-white shrink-0 overflow-hidden"
            style={{ background: ACCENT }}
          >
            {logoFor(biz) ? (
              <img
                src={logoFor(biz)}
                alt={`${biz.name} logo`}
                className="h-full w-full object-cover"
              />
            ) : (
              biz.initial
            )}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1">
              <p className="text-[14px] font-black" style={{ color: ink }}>
                {biz.name}
              </p>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke={muted}
                strokeWidth="2.5"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <p className="text-[10px] font-semibold" style={{ color: muted }}>
                Open for business
              </p>
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setTab(
                serviceEnabled.reservations
                  ? "tab2"
                  : serviceEnabled.ordering
                    ? "tab3"
                    : "overview",
              )
            }
            className="relative h-9 w-9 rounded-full flex items-center justify-center"
            style={{ background: subBg }}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke={ink}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
            {((serviceEnabled.reservations &&
              data.bookings.some(
                (item) => getBookingStatus(item.id, item.status) === "pending",
              )) ||
              (serviceEnabled.ordering &&
                data.orders.some(
                  (item) => getOrderStatus(item.id, item.status) === "new",
                ))) && (
              <span
                className="absolute top-1 right-1 h-2 w-2 rounded-full"
                style={{ background: ACCENT, border: `2px solid ${surface}` }}
              />
            )}
          </button>
          <button
            aria-label="Settings" onClick={() => setSettingsScreen("main")}
            className="h-9 w-9 rounded-full flex items-center justify-center"
            style={{ background: subBg }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={ink}
              strokeWidth="1.8"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Page title */}
      <div className="px-5 pt-4 pb-2 md:px-10 md:pt-7 md:pb-4 lg:px-16" style={{ background: bg }}>
        <p className="text-[21px] font-black" style={{ color: ink }}>
          {tab === "overview"
            ? "Dashboard"
            : tab === "services"
              ? "Services"
              : biz.tabs[TAB_IDS.indexOf(tab)]}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: muted }}>
          {tab === "overview"
            ? "Saturday, 30 August"
            : tab === "tab2"
              ? "Review and manage guest bookings"
              : tab === "tab3"
                ? "Track every order from new to completed"
                : tab === "tab4"
                  ? `Manage availability and pricing`
                  : "Choose which fajify tools your business uses"}
        </p>
      </div>

      {/* Content */}
      {tab === "overview" && renderOverview()}
      {tab === "tab2" && renderTab2()}
      {tab === "tab3" && renderTab3()}
      {tab === "tab4" && renderTab4()}
      {tab === "services" && renderServices()}

      {/* Order detail and status workflow */}
      {selectedOrderId &&
        (() => {
          const order = data.orders.find((item) => item.id === selectedOrderId)
          if (!order) return null
          const status = getOrderStatus(order.id, order.status)
          const steps = ["new", "preparing", "ready", "completed"]
          const currentStep = steps.indexOf(status)
          const commission = Math.round(order.amount * 0.12)
          const net = order.amount - commission
          return (
            <div className="vendor-modal-overlay fixed inset-0 z-50 flex flex-col justify-end max-w-[430px] mx-auto">
              <div
                className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
                onClick={() => {
                  setSelectedOrderId(null)
                  setCancelOrderOpen(false)
                }}
              />
              <div
                className="vendor-modal-panel relative rounded-t-[28px] overflow-hidden"
                style={{ background: surface, zIndex: 1 }}
              >
                <div className="flex justify-center pt-3 pb-2">
                  <div
                    className="h-1 w-10 rounded-full"
                    style={{ background: dark ? "#444" : "#DDD" }}
                  />
                </div>
                <div
                  className="px-5 pb-4 flex items-start justify-between"
                  style={{ borderBottom: `1px solid ${border}` }}
                >
                  <div>
                    <p
                      className="text-[10px] font-black uppercase tracking-wider"
                      style={{ color: ACCENT }}
                    >
                      Order details
                    </p>
                    <p
                      className="text-[17px] font-black mt-0.5"
                      style={{ color: ink }}
                    >
                      ORD#{biz.id.toUpperCase().slice(0, 3)}-
                      {order.id.toUpperCase()}-2026
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedOrderId(null)
                      setCancelOrderOpen(false)
                    }}
                    className="h-8 w-8 rounded-full flex items-center justify-center"
                    style={{ background: subBg }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      stroke={muted}
                      strokeWidth="2.5"
                      fill="none"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="px-5 pt-4 pb-10 max-h-[75vh] overflow-y-auto [scrollbar-width:none]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className="text-[15px] font-black"
                        style={{ color: ink }}
                      >
                        {order.item}
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: muted }}>
                        {order.customer} · received {order.time}
                      </p>
                    </div>
                    <Chip status={status} />
                  </div>

                  <div
                    className="rounded-[16px] p-4 mt-4"
                    style={{ background: subBg }}
                  >
                    <p
                      className="text-[11px] font-black mb-3"
                      style={{ color: ink }}
                    >
                      Order progress
                    </p>
                    <div className="flex items-start">
                      {steps.map((step, index) => {
                        const done =
                          status !== "cancelled" && index <= currentStep
                        return (
                          <div
                            key={step}
                            className="flex-1 relative text-center"
                          >
                            {index < steps.length - 1 && (
                              <div
                                className="absolute top-2.5 left-1/2 w-full h-0.5"
                                style={{
                                  background:
                                    index < currentStep ? "#22c55e" : border,
                                }}
                              />
                            )}
                            <div
                              className="relative mx-auto h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-black"
                              style={{
                                background: done ? "#22c55e" : surface,
                                color: done ? "#fff" : muted,
                                border: `2px solid ${
                                  done ? "#22c55e" : border
                                }`,
                              }}
                            >
                              {done ? "✓" : index + 1}
                            </div>
                            <p
                              className="text-[8px] font-bold capitalize mt-1.5"
                              style={{ color: done ? ink : muted }}
                            >
                              {step}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                    {status === "cancelled" && (
                      <p
                        className="text-[10px] text-center mt-3 font-bold"
                        style={{ color: "#EF4444" }}
                      >
                        Cancelled · {cancelReason}
                      </p>
                    )}
                  </div>

                  <div className="mt-4">
                    {[
                      ["Customer paid", fmt(order.amount)],
                      ["fajify commission (12%)", `−${fmt(commission)}`],
                      ["Your net earnings", fmt(net)],
                    ].map(([label, value], index) => (
                      <div
                        key={label}
                        className="flex justify-between py-2.5"
                        style={{
                          borderBottom:
                            index < 2 ? `1px solid ${border}` : "none",
                        }}
                      >
                        <p className="text-[11px]" style={{ color: muted }}>
                          {label}
                        </p>
                        <p
                          className="text-[12px] font-black"
                          style={{ color: index === 2 ? "#22c55e" : ink }}
                        >
                          {value}
                        </p>
                      </div>
                    ))}
                    <p
                      className="text-[9px] mt-1.5 leading-relaxed"
                      style={{ color: muted }}
                    >
                      Commission is automatically deducted from settlement. No
                      separate payment is required.
                    </p>
                  </div>

                  {cancelOrderOpen ? (
                    <div
                      className="rounded-[16px] p-4 mt-4"
                      style={{
                        background: "#EF444410",
                        border: "1px solid #EF444430",
                      }}
                    >
                      <p
                        className="text-[12px] font-black"
                        style={{ color: "#EF4444" }}
                      >
                        Cancel this order?
                      </p>
                      <p
                        className="text-[10px] mt-1 mb-3"
                        style={{ color: muted }}
                      >
                        The customer will be notified and the payment will be
                        returned according to the refund policy.
                      </p>
                      <select
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="w-full rounded-[12px] px-3 py-3 text-[12px] font-semibold outline-none border"
                        style={fieldStyle}
                      >
                        {[
                          "Item unavailable",
                          "Kitchen is closed",
                          "Unable to fulfil on time",
                          "Customer requested cancellation",
                        ].map((reason) => (
                          <option key={reason}>{reason}</option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <button
                          onClick={() => setCancelOrderOpen(false)}
                          className="rounded-[12px] py-3 text-[11px] font-black"
                          style={{ background: surface, color: muted }}
                        >
                          Keep order
                        </button>
                        <button
                          onClick={() => cancelOrder(order.id)}
                          className="rounded-[12px] py-3 text-[11px] font-black text-white"
                          style={{ background: "#EF4444" }}
                        >
                          Confirm cancel
                        </button>
                      </div>
                    </div>
                  ) : status !== "completed" && status !== "cancelled" ? (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => setCancelOrderOpen(true)}
                        className="flex-1 rounded-[14px] py-3.5 text-[12px] font-black"
                        style={{
                          background: subBg,
                          color: "#EF4444",
                          border: `1px solid ${border}`,
                        }}
                      >
                        Cancel order
                      </button>
                      <button
                        onClick={() => advanceOrder(order.id, status)}
                        className="flex-[1.4] rounded-[14px] py-3.5 text-[12px] font-black text-white"
                        style={{
                          background:
                            status === "new"
                              ? ACCENT
                              : status === "preparing"
                                ? AMBER
                                : "#22c55e",
                        }}
                      >
                        {status === "new"
                          ? "Accept order"
                          : status === "preparing"
                            ? "Mark ready"
                            : "Complete order"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })()}

      {healthOpen && (
        <div ref={healthDialogRef} role="dialog" aria-modal="true" aria-label="Business health details" className="vendor-modal-overlay fixed inset-0 z-50 flex flex-col justify-end max-w-[430px] mx-auto">
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
            aria-label="Close business health" onClick={() => setHealthOpen(false)}
          />
          <div
            className="vendor-modal-panel relative rounded-t-[28px] overflow-hidden"
            style={{ background: surface, zIndex: 1 }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div
                className="h-1 w-10 rounded-full"
                style={{ background: dark ? "#444" : "#DDD" }}
              />
            </div>
            <div
              className="px-5 pb-4 flex items-start justify-between"
              style={{ borderBottom: `1px solid ${border}` }}
            >
              <div>
                <p
                  className="text-[10px] font-black uppercase tracking-wider"
                  style={{ color: ACCENT }}
                >
                  Customer signals
                </p>
                <p
                  className="text-[19px] font-black mt-0.5"
                  style={{ color: ink }}
                >
                  Business Health Score
                </p>
                <p className="text-[10px] mt-1" style={{ color: muted }}>
                  {health.updatedAt}
                </p>
              </div>
              <button
                aria-label="Close business health" onClick={() => setHealthOpen(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center"
                style={{ background: subBg }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  stroke={muted}
                  strokeWidth="2.5"
                  fill="none"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="px-5 pt-5 pb-10 max-h-[78vh] overflow-y-auto [scrollbar-width:none]">
              <div
                className="rounded-[20px] p-4 flex items-center gap-4"
                style={{
                  background: health.status.color + "0D",
                  border: `1px solid ${health.status.color}25`,
                }}
              >
                <div className="relative h-20 w-20 shrink-0">
                  <svg
                    width="80"
                    height="80"
                    viewBox="0 0 80 80"
                    style={{ transform: "rotate(-90deg)" }}
                  >
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      fill="none"
                      stroke={subBg}
                      strokeWidth="7"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      fill="none"
                      stroke={health.status.color}
                      strokeWidth="7"
                      strokeDasharray={`${(health.overall / 100) * 201} 201`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      className="text-[23px] font-black leading-none"
                      style={{ color: ink }}
                    >
                      {health.overall}
                    </span>
                    <span
                      className="text-[8px] font-bold mt-0.5"
                      style={{ color: muted }}
                    >
                      /100
                    </span>
                  </div>
                </div>
                <div>
                  <p
                    className="text-[16px] font-black"
                    style={{ color: health.status.color }}
                  >
                    {health.status.label}
                  </p>
                  <p
                    className="text-[11px] font-black mt-1"
                    style={{
                      color:
                        health.delta < 0
                          ? "#EF4444"
                          : health.delta > 0
                            ? "#16A34A"
                            : muted,
                    }}
                  >
                    {healthTrend} since the last update
                  </p>
                  <p
                    className="text-[10px] leading-relaxed mt-2"
                    style={{ color: muted }}
                  >
                    {health.insight}
                  </p>
                </div>
              </div>

              <p
                className="text-[13px] font-black mt-5 mb-2.5"
                style={{ color: ink }}
              >
                What customers see
              </p>
              <div
                className="rounded-[20px] overflow-hidden"
                style={{ border: `1px solid ${border}` }}
              >
                <div
                  className="p-4"
                  style={{
                    background: surface,
                    borderBottom: `1px solid ${border}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p
                      className="text-[12px] font-black"
                      style={{ color: ink }}
                    >
                      Customer rating
                    </p>
                    <div className="flex items-center gap-1.5">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="#FFC107"
                        stroke="none"
                        aria-hidden="true"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      <p
                        className="text-[13px] font-black"
                        style={{ color: "#D89400" }}
                      >
                        {customerRating.toFixed(1)}
                      </p>
                      <span
                        className="text-[9px] font-bold"
                        style={{ color: muted }}
                      >
                        / 5
                      </span>
                    </div>
                  </div>
                  <div
                    className="h-1.5 rounded-full mt-2.5 overflow-hidden"
                    style={{ background: subBg }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(customerRating / 5) * 100}%`,
                        background: "#FFC107",
                      }}
                    />
                  </div>
                  <p
                    className="text-[9px] leading-relaxed mt-2"
                    style={{ color: muted }}
                  >
                    Average star rating from verified customer reviews.
                  </p>
                </div>
                {([
                  "responsiveness",
                  "satisfaction",
                  "quality",
                ] as HealthFactorKey[]).map((factor, index) => {
                  const meta = HEALTH_FACTOR_META[factor]
                  const value = health[factor]
                  const factorColor =
                    value >= 88 ? "#16A34A" : value >= 74 ? AMBER : "#EF4444"
                  const isFocus = factor === health.focus
                  return (
                    <div
                      key={factor}
                      className="p-4"
                      style={{
                        background: surface,
                        borderBottom:
                          index < 2 ? `1px solid ${border}` : "none",
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <p
                            className="text-[12px] font-black"
                            style={{ color: ink }}
                          >
                            {meta.label}
                          </p>
                          {isFocus && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[8px] font-black"
                              style={{
                                color: "#EF4444",
                                background: "#EF444412",
                              }}
                            >
                              Focus area
                            </span>
                          )}
                        </div>
                        <p
                          className="text-[13px] font-black"
                          style={{ color: factorColor }}
                        >
                          {value}
                        </p>
                      </div>
                      <div
                        className="h-1.5 rounded-full mt-2.5 overflow-hidden"
                        style={{ background: subBg }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${value}%`,
                            background: factorColor,
                          }}
                        />
                      </div>
                      <p
                        className="text-[9px] leading-relaxed mt-2"
                        style={{ color: muted }}
                      >
                        {meta.description}
                      </p>
                    </div>
                  )
                })}
              </div>

              <div
                className="rounded-[18px] p-4 mt-4"
                style={{
                  background: ACCENT + "0C",
                  border: `1px solid ${ACCENT}20`,
                }}
              >
                <p
                  className="text-[10px] font-black uppercase tracking-wider"
                  style={{ color: ACCENT }}
                >
                  Recommended next step
                </p>
                <p
                  className="text-[11px] leading-relaxed mt-1.5"
                  style={{ color: ink }}
                >
                  {HEALTH_FACTOR_META[health.focus].recommendation}
                </p>
              </div>

              <p
                className="text-[9px] leading-relaxed text-center mt-4 px-3"
                style={{ color: muted }}
              >
                Scores are calculated from customer activity and platform
                signals. They can’t be edited manually.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div
        className="vendor-bottom-nav fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] pb-5 pt-2 px-2.5"
        style={{
          background: surface,
          borderTop: `1px solid ${border}`,
          boxShadow: "0 -8px 24px rgba(0,0,0,.05)",
        }}
      >
        <div className="flex gap-1">
          {visibleTabIds.map((id) => {
            const active = tab === id
            const label = tabLabel(id)
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="flex-1 min-w-0 flex flex-col items-center gap-0.5 rounded-[12px] py-1.5"
                style={{ background: active ? ACCENT + "0E" : "transparent" }}
              >
                <NavIcon
                  id={id}
                  active={active}
                  color={active ? ACCENT : muted}
                />
                <span
                  className="text-[9px] font-black truncate max-w-full px-0.5"
                  style={{ color: active ? ACCENT : muted }}
                >
                  {label.split(" ")[0]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Overlays */}
      {settingsOpen && renderSettings()}
      {addItemOpen && renderAddItem()}
      {bizPickerOpen && renderBizPicker()}
      {scannerOpen && (
        <QRScanner
          accent={ACCENT}
          dark={dark}
          scans={[...data.bookings.slice(0, 2).map(booking => ({valid: getBookingStatus(booking.id, booking.status) === 'confirmed' || !!checkedIn[`DEMO:${biz.id}:${booking.id}`], type: 'booking' as const, name: booking.name, detail: `${booking.detail} · ${booking.guests} guests`, ref: `DEMO:${biz.id}:${booking.id}`})), {valid: false, type: 'booking', name: 'Unknown', detail: 'Ticket not found or expired', ref: 'INVALID'}]}
          checkedIn={checkedIn}
          onCheckIn={result => {
            const bookingId = result.ref.split(':')[2]
            const booking = data.bookings.find(booking => booking.id === bookingId)
            if (!booking || getBookingStatus(bookingId, booking.status) === 'cancelled') return
            setCheckedIn(previous => ({...previous, [result.ref]: true}))
            setBookingStatuses(previous => ({...previous, [`${biz.id}:${bookingId}`]: 'completed'}))
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  )
}
