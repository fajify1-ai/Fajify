import { useState } from "react"
import { IconArrowRight, IconGlyph, IconMapPin, IconSearch, IconStar } from "../components/Icons"

type Props = {
  onExplore: () => void
  onSearch?: (query: string) => void
  onGetStarted: () => void
  onSignIn: () => void
  onBusiness: () => void
  onRide: () => void
  onVenue: (id: string) => void
  onPlan: () => void
  live?: boolean
  venues?: typeof experiences
}

const experiences = [
  {
    id: "v1",
    name: "Shiro Lagos",
    category: "Fine dining",
    location: "Victoria Island",
    rating: "4.8",
    price: "From ₦25,000",
    image: "/reference/04466adc1422da8f.jpg",
  },
  {
    id: "v10",
    name: "Sky Bar Lagos",
    category: "Rooftop",
    location: "Victoria Island",
    rating: "4.7",
    price: "From ₦20,000",
    image: "/reference/a93bbecb0b1ef6cf.jpg",
  },
  {
    id: "v2",
    name: "Landmark Beach",
    category: "Beach club",
    location: "Lekki",
    rating: "4.7",
    price: "From ₦5,000",
    image: "/reference/834a5c12c1f068ad.jpg",
  },
]

const categories = [
  { label: "Restaurants", icon: "restaurant" as const },
  { label: "Events", icon: "ticket" as const },
  { label: "Nightlife", icon: "party" as const },
  { label: "Beaches", icon: "globe" as const },
  { label: "Movies", icon: "camera" as const },
]

function BrandLogo({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="flex items-center gap-2" aria-label="fajify">
      <svg className="h-9 w-9" viewBox="0 0 42 42" fill="none" aria-hidden="true">
        <path d="M10 30V15.5C10 8.5 14.7 5 20.2 5c5.2 0 9 3.1 9.3 8.5" stroke="#FA3F38" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M10 18.5h10.5M10 25h21v4.2c0 5.1-3.3 7.8-7.6 7.8-3 0-4.9-1.6-5.4-4" stroke="#FA3F38" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="36" r="2.6" fill="#FA3F38" />
      </svg>
      <span className={`text-2xl font-black tracking-[-0.05em] ${inverse ? "text-white" : "text-[#1A1A1A]"}`}>
        fajify
      </span>
    </div>
  )
}

function SearchPanel({ onExplore }: { onExplore: (query: string) => void }) {
  const [query, setQuery] = useState("")

  return (
    <form
      className="grid gap-2 rounded-[20px] border border-[#E8E8E8] bg-white p-2 shadow-[0_10px_30px_rgba(31,31,31,0.07)] sm:grid-cols-[1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault()
        onExplore(query)
      }}
    >
      <label className="flex min-w-0 items-center gap-3 rounded-2xl px-4 py-3">
        <IconSearch size={21} color="#777477" />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A9494]">Find your next experience</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Restaurant, event or neighbourhood"
            className="mt-0.5 w-full bg-transparent text-sm font-semibold text-[#1A1A1A] outline-none placeholder:text-[#9A9494]"
          />
        </span>
      </label>
      <button
        type="submit"
        className="flex items-center justify-center gap-2 rounded-2xl bg-[#FA3F38] px-6 py-4 text-sm font-extrabold text-white transition hover:bg-[#E9352F] sm:py-3"
      >
        Explore Lagos
        <IconArrowRight size={16} color="white" />
      </button>
    </form>
  )
}

export default function LandingScreen({ onExplore, onSearch, onGetStarted, onSignIn, onBusiness, onRide, onVenue, onPlan, live = false, venues }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <main className="min-h-screen overflow-hidden bg-white font-[family-name:var(--font-ui)] text-[#1A1A1A]">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-black/5 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Go to top">
            <BrandLogo />
          </button>

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary navigation">
            <a href="#discover" className="text-sm font-bold text-[#5F5A5B] transition hover:text-[#FA3F38]">Discover</a>
            <a href="#how-it-works" className="text-sm font-bold text-[#5F5A5B] transition hover:text-[#FA3F38]">How it works</a>
            <button onClick={onBusiness} className="text-sm font-bold text-[#5F5A5B] transition hover:text-[#FA3F38]">For business</button>
            <button onClick={onRide} className="text-sm font-bold text-[#5F5A5B] transition hover:text-[#FA3F38]">Drive with us</button>
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <button onClick={onSignIn} className="rounded-full px-5 py-3 text-sm font-extrabold text-[#1A1A1A] transition hover:bg-[#F7EFEE]">
              Sign in
            </button>
            <button onClick={onGetStarted} className="rounded-full bg-[#FA3F38] px-6 py-3 text-sm font-extrabold text-white shadow-[0_8px_24px_rgba(250,63,56,0.25)] transition hover:-translate-y-0.5 hover:bg-[#E9352F]">
              Get started
            </button>
          </div>

          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="grid h-11 w-11 place-items-center rounded-full bg-[#F8EFEE] sm:hidden"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-black/5 bg-white px-5 py-5 sm:hidden">
            <div className="flex flex-col gap-1">
              <a href="#discover" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-bold">Discover</a>
              <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-bold">How it works</a>
              <button onClick={onBusiness} className="rounded-xl px-3 py-3 text-left text-sm font-bold">For business</button>
              <button onClick={onRide} className="rounded-xl px-3 py-3 text-left text-sm font-bold">Drive with us</button>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={onSignIn} className="rounded-full border border-[#E8E1E0] px-4 py-3 text-sm font-extrabold">Sign in</button>
                <button onClick={onGetStarted} className="rounded-full bg-[#FA3F38] px-4 py-3 text-sm font-extrabold text-white">Get started</button>
              </div>
            </div>
          </div>
        )}
      </header>

      <section className="relative bg-white pt-[72px]">
        <div className="relative mx-auto grid min-h-[760px] max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:min-h-[800px] lg:grid-cols-[0.95fr_1.05fr] lg:px-10 lg:py-20">
          <div className="relative z-10 pt-4 lg:pt-0">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6F6A6B]">
              <span className="h-2 w-2 rounded-full bg-[#FA3F38]" />
              Discover Lagos with ease
            </div>
            <h1 className="max-w-2xl text-[clamp(3rem,5vw,4.5rem)] font-black leading-[0.95] tracking-[-0.065em] text-[#171315]">
              We simplify the planning.
              <span className="mt-2 block text-[#FA3F38]">You enjoy the moments.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base font-medium leading-7 text-[#6F6668] sm:text-lg">
              Find Lagos&apos; best restaurants, events and experiences in one place. Explore published places and check live availability.
            </p>
            <div className="mt-8 max-w-2xl">
              <SearchPanel onExplore={onSearch ?? onExplore} />
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-bold text-[#766D6F]">
              <span className="flex items-center gap-2"><IconGlyph name="shield" size={17} color="#FA3F38" /> Secure booking</span>
              <span className="flex items-center gap-2"><IconGlyph name="ticket" size={17} color="#FA3F38" /> Instant confirmation</span>
              <span className="flex items-center gap-2"><IconGlyph name="car" size={17} color="#FA3F38" /> Add a ride</span>
            </div>
          </div>

          <div className="relative mx-auto h-[470px] w-full max-w-[620px] sm:h-[580px] lg:h-[640px]">
            <div className="absolute inset-x-[6%] top-[5%] h-[82%] overflow-hidden rounded-[34px] bg-[#1A1A1A] shadow-[0_24px_70px_rgba(31,31,31,0.16)] sm:inset-x-[10%]">
              <img
                src="/reference/13f31cdb447e3f83.jpg"
                alt="Guests enjoying an evening at a rooftop restaurant"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/70">Tonight&apos;s mood</p>
                <p className="mt-2 text-2xl font-black tracking-[-0.04em] sm:text-3xl">Rooftop dinner &amp; city lights</p>
                <button onClick={() => onVenue("v10")} className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-extrabold text-[#1A1A1A]">
                  Book this vibe <IconArrowRight size={15} color="#1A1A1A" />
                </button>
              </div>
            </div>

            <div className="absolute left-0 top-[12%] rounded-2xl bg-white p-3 shadow-[0_15px_45px_rgba(45,25,22,0.2)] sm:left-[1%] sm:p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FFF0EF]"><IconGlyph name="calendar" size={20} color="#FA3F38" /></span>
                <span>
                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#A49B9C]">Reservation</span>
                  <span className="mt-0.5 block text-xs font-black text-[#1A1A1A]">Friday · 8:30 PM</span>
                </span>
              </div>
            </div>

            <div className="absolute bottom-[4%] right-0 max-w-[210px] rounded-2xl border border-[#E8E8E8] bg-white p-4 text-[#1A1A1A] shadow-[0_14px_40px_rgba(31,31,31,0.12)] sm:right-[1%] sm:p-5">
              <div className="flex items-center gap-1 text-xs font-black"><IconStar size={15} color="#FA3F38" /> {live ? 'Explore Fajify' : '4.9 from 2k+ explorers'}</div>
              <p className="mt-2 text-xs font-medium leading-5 text-[#777477]">Real spots, simple bookings, memorable nights.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#EEE7E5] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-12 gap-y-6 px-5 py-7 sm:px-8 lg:justify-between lg:px-10">
          <span className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#A29A9B]">One app for the whole plan</span>
          {categories.map(({ label, icon }) => (
            <button key={label} onClick={onExplore} className="flex items-center gap-2 text-sm font-extrabold text-[#3E393A] transition hover:text-[#FA3F38]">
              <IconGlyph name={icon} size={19} color="#FA3F38" />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section id="discover" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#FA3F38]">Trending in Lagos</p>
            <h2 className="mt-3 max-w-2xl text-4xl font-black leading-none tracking-[-0.05em] sm:text-5xl">
              Go where the city feels alive.
            </h2>
          </div>
          <button onClick={onExplore} className="flex items-center gap-2 rounded-full border border-[#DDD4D2] px-5 py-3 text-sm font-extrabold transition hover:border-[#FA3F38] hover:text-[#FA3F38]">
            Explore everything <IconArrowRight size={16} color="currentColor" />
          </button>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {(venues ?? experiences).map((experience, index) => (
            <button
              key={experience.id}
              onClick={() => onVenue(experience.id)}
              className={`group relative min-h-[420px] overflow-hidden rounded-[28px] text-left shadow-[0_12px_35px_rgba(44,28,25,0.08)] ${index === 0 ? "md:col-span-2 lg:col-span-1" : ""}`}
            >
              <img src={experience.image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/5" />
              <span className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-[#1A1A1A] backdrop-blur">
                {experience.category}
              </span>
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-white/75">
                  <IconMapPin size={14} color="white" /> {experience.location}
                </div>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-2xl font-black tracking-[-0.04em]">{experience.name}</p>
                    <p className="mt-1 text-xs font-semibold text-white/70">{experience.price}</p>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-black text-[#1A1A1A]">
                    <IconStar size={13} /> {experience.rating}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="border-y border-[#ECECEC] bg-[#F8F8F8] py-20 text-[#1A1A1A] lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#FA3F38]">Your night, sorted</p>
              <h2 className="mt-4 text-4xl font-black leading-[0.98] tracking-[-0.05em] sm:text-5xl">
                From “what should we do?” to done.
              </h2>
              <p className="mt-5 max-w-md text-sm font-medium leading-6 text-[#777477]">
                Stop juggling tabs and group chats. Build a complete plan in one place and share it with everyone.
              </p>
              <button onClick={onPlan} className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#FA3F38] px-6 py-4 text-sm font-extrabold text-white">
                Plan my night <IconArrowRight size={16} color="white" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { n: "01", icon: "search" as const, title: "Discover", body: "Find handpicked places and happenings that match your mood." },
                { n: "02", icon: "calendar" as const, title: "Book", body: "Reserve your table or ticket with instant confirmation." },
                { n: "03", icon: "car" as const, title: "Go", body: "Add a ride, invite friends and enjoy the whole experience." },
              ].map((step) => (
                <div key={step.n} className="rounded-[26px] border border-[#E5E5E5] bg-white p-6">
                  <div className="flex items-center justify-between">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#FFF0EF]"><IconGlyph name={step.icon} size={22} color="#FA3F38" /></span>
                    <span className="text-xs font-black text-[#C7C2C3]">{step.n}</span>
                  </div>
                  <p className="mt-8 text-xl font-black">{step.title}</p>
                  <p className="mt-3 text-xs font-medium leading-5 text-[#777477]">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="relative overflow-hidden rounded-[32px] border border-[#E8E8E8] bg-[#FAFAFA] px-6 py-14 text-[#1A1A1A] sm:px-12 lg:px-16 lg:py-16">
          <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#FA3F38]">Everything in one place</p>
              <h2 className="mt-4 max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                Less planning. More enjoying the moment.
              </h2>
            </div>
            <button onClick={onExplore} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FA3F38] px-7 py-4 text-sm font-extrabold text-white sm:w-auto">
              Explore fajify <IconArrowRight size={17} color="white" />
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#EDE5E3] bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-10">
          <div>
            <BrandLogo />
            <p className="mt-4 max-w-xs text-xs font-medium leading-5 text-[#81797A]">Lagos experiences, beautifully planned. Discover places and plan memorable moments.</p>
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#A29A9B]">Explore</p>
            <div className="mt-4 flex flex-col items-start gap-3 text-sm font-bold">
              <button onClick={onExplore}>Restaurants</button>
              <button onClick={onExplore}>Events</button>
              <button onClick={onExplore}>Experiences</button>
            </div>
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#A29A9B]">Partners</p>
            <div className="mt-4 flex flex-col items-start gap-3 text-sm font-bold">
              <button onClick={onBusiness}>fajify Business</button>
              <button onClick={onRide}>fajify Ride</button>
            </div>
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#A29A9B]">Made for Lagos</p>
            <p className="mt-4 text-sm font-bold">Victoria Island · Lekki · Ikoyi · Ikeja</p>
            <p className="mt-3 text-xs font-medium text-[#81797A]">Photography via Unsplash</p>
          </div>
        </div>
        <div className="border-t border-[#F0EAE8] px-5 py-5 text-center text-[11px] font-semibold text-[#9A9293]">
          © {new Date().getFullYear()} fajify. We simplify the planning. You enjoy the moments.
        </div>
      </footer>
    </main>
  )
}
