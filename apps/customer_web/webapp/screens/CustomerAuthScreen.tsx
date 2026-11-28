import { useState } from "react"
import { passwordsMatch } from "@faji/web-auth/password"
import FajifyLogo from "../components/FajifyLogo"
import BusinessFajifyLogo from "@faji/business-web/webapp/components/FajifyLogo"

type AuthMode = "signin" | "register"

type Props = {
  initialMode: AuthMode
  onBack: () => void
  onComplete: () => void
  onContinue?: () => void
  onResendVerification?: (email:string) => Promise<void>
  authenticate?: (mode: AuthMode, form: {name:string;email:string;phone:string;password:string;termsAccepted:boolean}) => Promise<void>
  onRecovery?: () => void
  businessExperience?: boolean
}

export default function CustomerAuthScreen({ initialMode, onBack, onComplete, onContinue, onResendVerification, authenticate, onRecovery, businessExperience = false }: Props) {
  const [busy,setBusy] = useState(false)
  const [verificationBusy,setVerificationBusy] = useState(false)
  const [error,setError] = useState('')
  const [verificationMessage,setVerificationMessage] = useState('')
  const [registrationComplete,setRegistrationComplete] = useState(false)
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState("")
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  })
  const [termsAccepted,setTermsAccepted] = useState(false)

  const update = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }))
  const heading = businessExperience ? "Your operation, clearly managed." : "We simplify the planning. You enjoy the moments."
  const description = businessExperience
    ? "Manage reservations, orders, availability, performance and payouts from one responsive workspace."
    : "Save places, manage bookings, keep every ticket together and make plans without the back-and-forth."

  async function resendVerification(){
    if(!onResendVerification || verificationBusy)return
    setVerificationBusy(true)
    setVerificationMessage('')
    try{
      await onResendVerification(form.email.trim())
      setVerificationMessage('If this account needs verification, a verification email has been sent.')
    }catch{
      setVerificationMessage('A verification email could not be sent right now. Please try again later.')
    }finally{
      setVerificationBusy(false)
    }
  }

  return (
    <main data-connected-auth={authenticate ? true : undefined} className="grid min-h-screen bg-white font-[family-name:var(--font-ui)] lg:grid-cols-[1.18fr_1fr]">
      {!authenticate && <p role="note" style={{position:"fixed",bottom:8,left:8,zIndex:9999,background:"white",color:"#363437",padding:"8px 12px",borderRadius:8,fontSize:12}}>Visual preview only · No account is created or signed in</p>}
      <section className={`relative hidden min-h-screen overflow-hidden lg:block ${businessExperience ? "bg-[#171717]" : "bg-[#171313]"}`}>
        <img
          src={businessExperience ? "/reference/d2aaaff55cdcccab.jpg" : "/reference/d8af0027ad38dbe5.jpg"}
          alt={businessExperience ? "A busy restaurant prepared for service" : "Friends enjoying an evening together"}
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/15" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white xl:p-16">
          <p className={`text-xs font-bold uppercase tracking-[0.18em] ${businessExperience ? "text-white/60" : "text-[#FF8A85]"}`}>{businessExperience ? "fajify Business" : "fajify"}</p>
          <h1 className="mt-4 max-w-xl text-4xl font-black leading-[1.02] tracking-[-0.055em]">
            {heading}
          </h1>
          <p className="mt-5 max-w-lg text-sm font-medium leading-6 text-white/70">
            {description}
          </p>
        </div>
      </section>

      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16 xl:px-24">
        <button onClick={onBack} className="flex w-fit items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-[#5F5A5B] hover:bg-[#F5F5F5]">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {businessExperience ? "Back to website" : "Back"}
        </button>

        <div className="mx-auto flex w-full max-w-[364px] flex-1 flex-col justify-center py-10">
          <div className="mb-6">
            {businessExperience ? <BusinessFajifyLogo suffix="Business" compact /> : <FajifyLogo />}
            <h2 className={`mt-6 ${businessExperience ? "text-2xl" : "text-3xl"} font-black tracking-[-0.045em] text-[#1A1A1A]`}>
              {mode === "signin" ? "Welcome back" : businessExperience ? "Register your business" : "Create your account"}
            </h2>
            <p className="mt-2 text-sm font-medium text-[#777477]">
              {businessExperience
                ? mode === "signin" ? "Sign in to manage your business account." : "Create your account to start setting up your business."
                : mode === "signin"
                ? "Sign in to manage your plans and bookings."
                : "Join fajify and keep every experience in one place."}
            </p>
          </div>

          {!registrationComplete && <form
            className="auth-credentials flex flex-col gap-4"
            onSubmit={async (event) => {
              event.preventDefault()
              if(busy)return
              setError('')
              if(mode==='register'&&!passwordsMatch(form.password,confirmPassword)){
                setError('Passwords do not match.')
                return
              }
              if(!authenticate){onComplete();return}
              setBusy(true);setVerificationMessage('')
              try{
                await authenticate(mode,{...form,termsAccepted})
                if(mode==='register'){
                  setRegistrationComplete(true)
                  setForm(current=>({...current,password:''}))
                  setConfirmPassword('')
                }
              }catch(error){setError(error instanceof Error?error.message:'Sign-in unavailable. Please retry.')}finally{setBusy(false)}
            }}
          >
            {mode === "register" && (
              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold text-[#4F4A4B]">Full name</span>
                <input
                  required={!!authenticate}
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="Your full name"
                  className="h-14 rounded-2xl border border-[#E4E4E4] bg-[#FAFAFA] px-4 text-sm font-medium outline-none focus:border-[#FA3F38]"
                />
              </label>
            )}

            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold text-[#4F4A4B]">Email address</span>
              <input
                type="email"
                required={!!authenticate}
                autoComplete="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="you@email.com"
                className="h-14 rounded-2xl border border-[#E4E4E4] bg-[#FAFAFA] px-4 text-sm font-medium outline-none focus:border-[#FA3F38]"
              />
            </label>

            {mode === "register" && (
              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold text-[#4F4A4B]">Phone number</span>
                <input
                  type="tel"
                  required={!!authenticate}
                  pattern="\+[1-9][0-9]{6,14}"
                  value={form.phone}
                  onChange={(event) => update("phone", event.target.value)}
                  placeholder="+234 801 234 5678"
                  className="h-14 rounded-2xl border border-[#E4E4E4] bg-[#FAFAFA] px-4 text-sm font-medium outline-none focus:border-[#FA3F38]"
                />
              </label>
            )}

            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold text-[#4F4A4B]">Password</span>
              <span className="relative flex h-14 items-center overflow-hidden rounded-2xl border border-[#E4E4E4] bg-[#FAFAFA] focus-within:border-[#FA3F38] focus-within:ring-2 focus-within:ring-[#FA3F38]/10">
                <input
                  aria-label="Password"
                  type={showPassword ? "text" : "password"}
                  required={!!authenticate}
                  minLength={authenticate && mode==='register'?12:undefined}
                  maxLength={128}
                  autoComplete={mode==='signin'?'current-password':'new-password'}
                  value={form.password}
                  onChange={(event) => {
                    update("password", event.target.value)
                    if(error)setError('')
                  }}
                  placeholder={mode === "register" ? "Create a password" : "Enter your password"}
                  className="h-full min-w-0 flex-1 rounded-l-2xl border-0 bg-transparent px-4 pr-16 text-sm font-medium outline-none ring-0"
                />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((shown) => !shown)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-2 text-xs font-bold text-[#777477] outline-none hover:text-[#1A1A1A]">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </span>
            </label>

            {mode === "register" && (
              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold text-[#4F4A4B]">Confirm password</span>
                <input
                  type="password"
                  required
                  minLength={authenticate ? 12 : undefined}
                  maxLength={128}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value)
                    if(error)setError('')
                  }}
                  placeholder="Re-enter your password"
                  className="h-14 rounded-2xl border border-[#E4E4E4] bg-[#FAFAFA] px-4 text-sm font-medium outline-none focus:border-[#FA3F38]"
                />
              </label>
            )}

            {mode === "signin" && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#6F696A]">
                  <input type="checkbox" className="h-4 w-4 accent-[#FA3F38]" />
                  Remember me
                </label>
                <button type="button" onClick={onRecovery} className="text-xs font-bold text-[#FA3F38]">Forgot password?</button>
              </div>
            )}

            {mode === "register" && (
              <label className="flex items-start gap-3 text-xs font-semibold leading-5 text-[#6F696A]">
                <input
                  type="checkbox"
                  required={!!authenticate}
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#FA3F38]"
                />
                <span>I agree to the Fajify Terms &amp; Conditions and Privacy Policy.</span>
              </label>
            )}

            <button type="submit" disabled={busy} className="mt-2 h-14 rounded-2xl bg-[#FA3F38] text-sm font-black text-white transition hover:bg-[#E9352F]">
              {busy?"Please wait…":mode === "signin" ? "Sign in" : "Create account"}
            </button>
            {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
          </form>}

          {registrationComplete&&<section className="mt-6 rounded-2xl border border-[#DDEBDD] bg-[#F5FBF5] p-5" aria-labelledby="registration-success">
            <h3 id="registration-success" className="text-base font-bold text-[#214D2A]">Account created</h3>
            <p className="mt-2 text-sm leading-6 text-[#4F6652]">
              {businessExperience
                ? `Your account was created. Continue to start business setup. Business features remain subject to approval and account membership. Email verification requirements may apply to some account privileges.`
                : `We attempted to send a verification link to ${form.email}. Check your inbox and spam folder to verify your address. You can continue to Fajify now; verified email is required for certain account privileges.`}
            </p>
            {onContinue&&<button type="button" onClick={onContinue} className="mt-4 h-12 w-full rounded-2xl bg-[#FA3F38] text-sm font-black text-white">{businessExperience ? "Continue to business verification" : "Continue to Fajify"}</button>}
            {onResendVerification&&<button type="button" disabled={verificationBusy} onClick={()=>void resendVerification()} className="mt-3 w-full rounded-xl px-3 py-2 text-sm font-bold text-[#FA3F38] disabled:opacity-60">{verificationBusy?'Sending…':'Resend verification email'}</button>}
          </section>}

          {!registrationComplete&&<p className="mt-6 text-center text-sm font-medium text-[#777477]">
            {mode === "signin" ? "New to fajify?" : "Already have an account?"}
            <button
              onClick={() => setMode(mode === "signin" ? "register" : "signin")}
              className="ml-1.5 font-black text-[#FA3F38]"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>}
          {!registrationComplete&&mode==='signin'&&onResendVerification&&<button type="button" disabled={verificationBusy} onClick={()=>void resendVerification()} className="mt-3 text-center text-sm font-bold text-[#FA3F38] disabled:opacity-60">{verificationBusy?'Sending…':'Resend verification email'}</button>}
          {verificationMessage&&<p role="status" className="mt-3 text-center text-sm text-[#4F6652]">{verificationMessage}</p>}

        </div>
      </section>
    </main>
  )
}
