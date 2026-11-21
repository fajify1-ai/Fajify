"use client"

import { useState, useEffect, useRef } from 'react'
import OnboardingScreen from './screens/OnboardingScreen'
import HomeScreen from './screens/HomeScreen'
import RestaurantScreen from './screens/RestaurantScreen'
import CheckoutScreen from './screens/CheckoutScreen'
import ReservationScreen from './screens/ReservationScreen'
import TransportationScreen from './screens/TransportationScreen'
import CreateEventScreen from './screens/CreateEventScreen'
import ConfirmationScreen from './screens/ConfirmationScreen'
import EventDetailScreen from './screens/EventDetailScreen'
import WishlistScreen from './screens/WishlistScreen'
import MyTicketsScreen from './screens/MyTicketsScreen'
import NotificationsScreen from './screens/NotificationsScreen'
import OffersScreen from './screens/OffersScreen'
import InviteFriendsScreen from './screens/InviteFriendsScreen'
import HelpScreen from './screens/HelpScreen'
import SettingsScreen from './screens/SettingsScreen'
import ProfileScreen from './screens/ProfileScreen'
import PlanForMeScreen from './screens/PlanForMeScreen'
import BrowsePlansScreen from './screens/BrowsePlansScreen'
import CartScreen from './screens/CartScreen'
import GlobalCartScreen from './screens/GlobalCartScreen'
import DeliveryRestaurantScreen from './screens/DeliveryRestaurantScreen'
import DeliveryCartScreen from './screens/DeliveryCartScreen'
import OrderTrackingScreen from './screens/OrderTrackingScreen'
import LandingScreen from './screens/LandingScreen'
import BusinessSignInScreen from './screens/BusinessSignInScreen'
import RideSignInScreen from './screens/RideSignInScreen'
import CustomerAuthScreen from './screens/CustomerAuthScreen'

export type Screen =
  | { name: 'onboarding' }
  | { name: 'home'; search?: string }
  | { name: 'planForMe' }
  | { name: 'browsePlans' }
  | { name: 'cart'; venueId: string }
  | { name: 'globalCart' }
  | { name: 'deliveryRestaurant'; id: string }
  | { name: 'deliveryCart'; venueId: string }
  | { name: 'restaurant'; id: string }
  | { name: 'checkout'; venueId: string; bookingDate?: string; bookingTime?: string }
  | { name: 'reservation'; venueId: string }
  | { name: 'transportation'; venueId: string; bookingDetails: Record<string, string> }
  | { name: 'createEvent'; restaurantId?: string }
  | { name: 'confirmation'; type: 'reservation' | 'event'; details: Record<string, string> }
  | { name: 'eventDetail'; id: string }
  | { name: 'wishlist' }
  | { name: 'myTickets' }
  | { name: 'notifications' }
  | { name: 'offers' }
  | { name: 'inviteFriends' }
  | { name: 'help' }
  | { name: 'settings' }
  | { name: 'profile' }
  | { name: 'reviewHistory' }
  | { name: 'orderTracking'; orderTotal: string; venueName: string; venueImage: string; items: { name: string; qty: number; price: number }[] }

export type NavigateFn = (s: Screen) => void

export type AppMode = 'landing' | 'customer-auth' | 'customer' | 'business-signin' | 'ride-signin'

export default function App({initialMode='landing',initialScreen={name:'home'},deferRide=false}:{initialMode?:AppMode;initialScreen?:Screen;deferRide?:boolean}={}) {
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [mode, setMode] = useState<AppMode>(initialMode)
  const [pendingScreen, setPendingScreen] = useState<Screen | null>(null)
  const [authReturnMode, setAuthReturnMode] = useState<'landing' | 'customer'>('landing')
  const [customerAuthMode, setCustomerAuthMode] = useState<'signin' | 'register'>('signin')

  const restoringHistory = useRef(false)
  const historyReady = useRef(false)
  useEffect(() => {
    const restore = (event: PopStateEvent) => {
      const state = event.state?.fajifyPreview
      if (!state) return
      restoringHistory.current = true
      setMode(state.mode)
      setScreen(state.screen)
    }
    window.addEventListener('popstate', restore)
    return () => window.removeEventListener('popstate', restore)
  }, [])
  useEffect(() => {
    if (restoringHistory.current) { restoringHistory.current = false; return }
    const state = { ...window.history.state, fajifyPreview: { mode, screen } }
    if (!historyReady.current) {
      window.history.replaceState(state, '')
      historyReady.current = true
    } else window.history.pushState(state, '')
  }, [mode, screen])

  const navigate: NavigateFn = (s) => {
    if(deferRide&&['transportation','deliveryRestaurant','deliveryCart','orderTracking'].includes(s.name)){window.location.assign('/ride');return}
    window.scrollTo(0, 0)
    setScreen(s)
  }

  const openCustomer = (nextScreen: Screen = { name: 'home' }) => {
    window.scrollTo(0, 0)
    setScreen(nextScreen)
    setMode('customer')
  }

  if (mode === 'landing') {
    return (
      <LandingScreen
        onExplore={() => openCustomer()}
        onSearch={(search) => openCustomer({ name: 'home', search })}
        onGetStarted={() => { setAuthReturnMode('landing'); setCustomerAuthMode('register'); setMode('customer-auth') }}
        onSignIn={() => { setAuthReturnMode('landing'); setCustomerAuthMode('signin'); setMode('customer-auth') }}
        onBusiness={() => setMode('business-signin')}
        onRide={() => deferRide?window.location.assign('/ride'):setMode('ride-signin')}
        onVenue={(id) => openCustomer({ name: 'restaurant', id })}
        onPlan={() => openCustomer({ name: 'planForMe' })}
      />
    )
  }
  if (mode === 'customer-auth') {
    return (
      <CustomerAuthScreen
        initialMode={customerAuthMode}
        onBack={() => { setPendingScreen(null); setMode(authReturnMode) }}
        onComplete={() => {
          setMode('customer')
          setScreen(pendingScreen ?? { name: 'home' })
          setPendingScreen(null)
        }}
      />
    )
  }
  if (mode === 'business-signin') {
    return (
      <BusinessSignInScreen
        onBack={() => setMode('landing')}
        onSignIn={() => setMode('landing')}
        onRegister={() => setMode('landing')}
      />
    )
  }
  if (mode === 'ride-signin') {
    return (
      <RideSignInScreen
        onBack={() => setMode('landing')}
        onSignIn={() => setMode('landing')}
        onRegister={() => setMode('landing')}
      />
    )
  }
  if (screen.name === 'planForMe') return <PlanForMeScreen navigate={navigate} />
  if (screen.name === 'browsePlans') return <BrowsePlansScreen navigate={navigate} />
  if (screen.name === 'cart') return <CartScreen venueId={screen.venueId} navigate={navigate} />
  if (screen.name === 'globalCart') return <GlobalCartScreen navigate={navigate} />
  if (screen.name === 'deliveryRestaurant') return <DeliveryRestaurantScreen id={screen.id} navigate={navigate} />
  if (screen.name === 'deliveryCart') return <DeliveryCartScreen venueId={screen.venueId} navigate={navigate} />
  if (screen.name === 'onboarding') return <OnboardingScreen navigate={navigate} />
  if (screen.name === 'home') return <HomeScreen initialSearch={screen.search} navigate={navigate} onVendorSwitch={() => setMode('landing')} />
  if (screen.name === 'restaurant') return <RestaurantScreen id={screen.id} navigate={navigate} />
  if (screen.name === 'checkout') return <CheckoutScreen onRide={deferRide?()=>window.location.assign('/ride'):undefined} venueId={screen.venueId} bookingDate={screen.bookingDate} bookingTime={screen.bookingTime} navigate={navigate} />
  if (screen.name === 'reservation') return <ReservationScreen venueId={screen.venueId} navigate={navigate} />
  if (screen.name === 'transportation') return <TransportationScreen venueId={screen.venueId} bookingDetails={screen.bookingDetails} navigate={navigate} />
  if (screen.name === 'createEvent') return <CreateEventScreen restaurantId={screen.restaurantId} navigate={navigate} />
  if (screen.name === 'confirmation') return <ConfirmationScreen type={screen.type} details={screen.details} navigate={navigate} />
  if (screen.name === 'eventDetail') return <EventDetailScreen id={screen.id} navigate={navigate} />
  if (screen.name === 'wishlist') return <WishlistScreen navigate={navigate} />
  if (screen.name === 'myTickets') return <MyTicketsScreen navigate={navigate} />
  if (screen.name === 'notifications') return <NotificationsScreen navigate={navigate} />
  if (screen.name === 'offers') return <OffersScreen navigate={navigate} />
  if (screen.name === 'inviteFriends') return <InviteFriendsScreen navigate={navigate} />
  if (screen.name === 'help') return <HelpScreen navigate={navigate} />
  if (screen.name === 'settings') return <SettingsScreen navigate={navigate} />
  if (screen.name === 'reviewHistory') return (
    <main className="min-h-screen px-5 py-10 md:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <h1>My reviews</h1>
        <p>No reviews yet.</p>
        <button onClick={() => navigate({name:'profile'})} className="faji-primary mt-6">Back to profile</button>
      </div>
    </main>
  )
  if (screen.name === 'profile') return <ProfileScreen navigate={navigate} onLogout={() => { setMode('landing') }} />
  if (screen.name === 'orderTracking') return <OrderTrackingScreen navigate={navigate} orderTotal={screen.orderTotal} venueName={screen.venueName} venueImage={screen.venueImage} items={screen.items} />
  return null
}
