"use client"
import { useState } from 'react'
import BusinessSignInScreen from './screens/BusinessSignInScreen'
import BusinessOnboardingScreen from './screens/BusinessOnboardingScreen'
import VendorDashboardScreen from './screens/VendorDashboardScreen'
import FajifyLogo from './components/FajifyLogo'
import { Button } from '../components/ui/button'
type Mode = 'entry' | 'signin' | 'onboarding' | 'dashboard'
export default function App() {
  const [mode, setMode] = useState<Mode>('entry')
  const navigate = (next: Mode) => { window.scrollTo(0, 0); setMode(next) }
  return <>
    <div role="note" className="preview-notice">Business preview · Local data only · Sign-in, verification, QR and payouts are simulations</div>
    {mode === 'entry' ? <main className="business-entry min-h-screen grid lg:grid-cols-2 bg-white">
      <section className="flex flex-col justify-center gap-8 px-6 py-12 sm:px-12 lg:px-20">
        <FajifyLogo suffix="Business" />
        <div><h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">Your operation,<br/>clearly managed.</h1><p className="mt-5 text-base leading-7 text-[#777477]">Manage reservations, orders, availability, performance and payouts from one responsive workspace.</p></div>
        <div className="flex flex-wrap gap-3"><Button onClick={() => navigate('signin')}>Sign in to Business</Button><Button variant="outline" onClick={() => navigate('onboarding')}>Register your business</Button></div>
        <Button variant="ghost" className="self-start" onClick={() => navigate('dashboard')}>Explore merchant demo →</Button>
      </section>
      <img src="/reference/d2aaaff55cdcccab.jpg" alt="Restaurant prepared for service" className="h-80 w-full object-cover lg:h-screen" />
    </main> : null}
    {mode === 'signin' ? <BusinessSignInScreen onBack={() => navigate('entry')} onSignIn={() => navigate('dashboard')} onRegister={() => navigate('onboarding')} /> : null}
    {mode === 'onboarding' ? <BusinessOnboardingScreen onBack={() => navigate('entry')} onComplete={() => navigate('dashboard')} /> : null}
    {mode === 'dashboard' ? <VendorDashboardScreen onExit={() => navigate('entry')} /> : null}
  </>
}
