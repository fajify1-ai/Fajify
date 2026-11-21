import { useState } from "react"
import FajifyLogo from "../components/FajifyLogo"

type AuthMode = "signin" | "register"

type Props = {
  initialMode: AuthMode
  onBack: () => void
  onComplete: () => void
  authenticate?: (mode: AuthMode, form: {name:string;email:string;phone:string;password:string;termsAccepted:boolean}) => Promise<void>
  onRecovery?: () => void
}

export default function CustomerAuthScreen({ initialMode, onBack, onComplete, authenticate, onRecovery }: Props) {
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  })
  const [termsAccepted,setTermsAccepted] = useState(false)

  const update = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  return (
    <main data-connected-auth={authenticate ? true : undefined} className="grid min-h-screen bg-white font-[family-name:var(--font-ui)] lg:grid-cols-[1.05fr_0.95fr]">
      {!authenticate && <p role="note" style={{position:"fixed",bottom:8,left:8,zIndex:9999,background:"white",color:"#363437",padding:"8px 12px",borderRadius:8,fontSize:12}}>Visual preview only · No account is created or signed in</p>}
      <section className="relative hidden min-h-screen overflow-hidden bg-[#171313] lg:block">
        <img
          src="/reference/d8af0027ad38dbe5.jpg"
          alt="Friends enjoying an evening together"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/15" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white xl:p-16">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FF8A85]">fajify</p>
          <h1 className="mt-4 max-w-xl text-5xl font-black leading-[1.02] tracking-[-0.055em]">
            We simplify the planning. You enjoy the moments.
          </h1>
          <p className="mt-5 max-w-lg text-sm font-medium leading-6 text-white/70">
            Save places, manage bookings, keep every ticket together and make plans without the back-and-forth.
          </p>
        </div>
      </section>

      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16 xl:px-24">
        <button onClick={onBack} className="flex w-fit items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-[#5F5A5B] hover:bg-[#F5F5F5]">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </button>

        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-10">
          <div className="mb-6">
            <FajifyLogo />
            <h2 className="mt-6 text-3xl font-black tracking-[-0.045em] text-[#1A1A1A]">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-2 text-sm font-medium text-[#777477]">
              {mode === "signin"
                ? "Sign in to manage your plans and bookings."
                : "Join fajify and keep every experience in one place."}
            </p>
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={async (event) => {
              event.preventDefault()
              if(busy)return
              if(!authenticate){onComplete();return}
              setBusy(true);setError('')
              try{await authenticate(mode,{...form,termsAccepted})}catch(error){setError(error instanceof Error?error.message:'Sign-in unavailable. Please retry.')}finally{setBusy(false)}
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
                  onChange={(event) => update("password", event.target.value)}
                  placeholder={mode === "register" ? "Create a password" : "Enter your password"}
                  className="h-full min-w-0 flex-1 rounded-l-2xl border-0 bg-transparent px-4 pr-16 text-sm font-medium outline-none ring-0"
                />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((shown) => !shown)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-2 text-xs font-bold text-[#777477] outline-none hover:text-[#1A1A1A]">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </span>
            </label>

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
          </form>

          <p className="mt-6 text-center text-sm font-medium text-[#777477]">
            {mode === "signin" ? "New to fajify?" : "Already have an account?"}
            <button
              onClick={() => setMode(mode === "signin" ? "register" : "signin")}
              className="ml-1.5 font-black text-[#FA3F38]"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>

        </div>
      </section>
    </main>
  )
}
