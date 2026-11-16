"use client"
import { useState } from 'react'
import BusinessSignInScreen from './screens/BusinessSignInScreen'
import BusinessOnboardingScreen from './screens/BusinessOnboardingScreen'
import VendorDashboardScreen from './screens/VendorDashboardScreen'
import BusinessEntry from './components/BusinessEntry'
type Mode = 'entry' | 'signin' | 'onboarding' | 'dashboard'
export default function App({initialMode='entry'}:{initialMode?:Mode}={}) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const navigate = (next: Mode) => { window.scrollTo(0, 0); setMode(next) }
  return <>
    <div role="note" className="preview-notice">Business preview · Local data only · Sign-in, verification, QR and payouts are simulations</div>
    {mode === 'entry' ? <BusinessEntry onSignIn={()=>navigate('signin')} onRegister={()=>navigate('onboarding')} onExplore={()=>navigate('dashboard')}/> : null}
    {mode === 'signin' ? <BusinessSignInScreen onBack={() => navigate('entry')} onSignIn={() => navigate('dashboard')} onRegister={() => navigate('onboarding')} /> : null}
    {mode === 'onboarding' ? <BusinessOnboardingScreen onBack={() => navigate('entry')} onComplete={() => navigate('dashboard')} /> : null}
    {mode === 'dashboard' ? <VendorDashboardScreen onExit={() => navigate('entry')} /> : null}
  </>
}
