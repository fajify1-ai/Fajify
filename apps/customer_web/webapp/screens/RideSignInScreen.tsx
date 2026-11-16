import { useState } from "react"

type Props = {
  onBack: () => void
  onSignIn: () => void
  onRegister: () => void
}

export default function RideSignInScreen({ onBack, onSignIn, onRegister }: Props) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  return (
    <main className="grid min-h-screen bg-white font-[family-name:var(--font-ui)] lg:grid-cols-[1.05fr_0.95fr]">
      <p role="note" style={{position:"fixed",bottom:8,left:8,zIndex:9999,background:"white",color:"#363437",padding:"8px 12px",borderRadius:8,fontSize:12}}>Visual preview only · No account is created or signed in</p>
      <section className="relative hidden min-h-screen overflow-hidden bg-[#111714] lg:block">
        <img
          src="/reference/af2348fddcfbc8a3.jpg"
          alt="Driver travelling through the city"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white xl:p-16">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7EE2A8]">fajify Ride</p>
          <h1 className="mt-4 max-w-xl text-5xl font-black leading-[1.02] tracking-[-0.055em]">
            Drive smarter. Earn with clarity.
          </h1>
          <p className="mt-5 max-w-lg text-sm font-medium leading-6 text-white/70">
            Accept jobs, manage trips, track earnings and cash out from your dedicated driver workspace.
          </p>
        </div>
      </section>

      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16 xl:px-24">
        <button onClick={onBack} className="flex w-fit items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-[#5F5A5B] hover:bg-[#F5F5F5]">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back to website
        </button>

        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-12">
          <div className="mb-10">
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#22C55E]">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <path d="m5 16 1.5-6h11L19 16M4 16h16v3H4z" />
                  <circle cx="7" cy="19" r="1" />
                  <circle cx="17" cy="19" r="1" />
                </svg>
              </span>
              <span className="text-xl font-black tracking-[-0.04em]">fajify Ride</span>
            </div>
            <h2 className="mt-8 text-3xl font-black tracking-[-0.045em] text-[#1A1A1A]">Driver sign in</h2>
            <p className="mt-2 text-sm font-medium text-[#777477]">Sign in to access your jobs and earnings.</p>
          </div>

          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault()
              onSignIn()
            }}
          >
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold text-[#4F4A4B]">Email address or driver ID</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email or driver ID"
                className="h-14 rounded-2xl border border-[#E4E4E4] bg-[#FAFAFA] px-4 text-sm font-medium outline-none focus:border-[#22C55E]"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold text-[#4F4A4B]">Password</span>
              <span className="flex h-14 items-center rounded-2xl border border-[#E4E4E4] bg-[#FAFAFA] px-4 focus-within:border-[#22C55E]">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
                />
                <button type="button" onClick={() => setShowPassword((shown) => !shown)} className="text-xs font-bold text-[#777477]">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </span>
            </label>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#6F696A]">
                <input type="checkbox" className="h-4 w-4 accent-[#22C55E]" />
                Remember me
              </label>
              <button type="button" className="text-xs font-bold text-[#168A43]">Forgot password?</button>
            </div>

            <button type="submit" className="mt-2 h-14 rounded-2xl bg-[#22C55E] text-sm font-black text-white transition hover:bg-[#16A34A]">
              Sign in to Ride
            </button>
          </form>

          <div className="mt-8 border-t border-[#EEEEEE] pt-7 text-center">
            <p className="text-sm font-medium text-[#777477]">Want to drive or dispatch with fajify?</p>
            <button onClick={onRegister} className="mt-3 h-12 w-full rounded-2xl border border-[#DADADA] text-sm font-black text-[#1A1A1A] hover:border-[#22C55E] hover:text-[#168A43]">
              Register as a driver
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
