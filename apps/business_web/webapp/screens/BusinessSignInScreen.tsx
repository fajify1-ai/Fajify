import { useState } from "react"
import FajifyLogo from "../components/FajifyLogo"

type Props = {
  onBack: () => void
  onSignIn: () => void
  onRegister: () => void
}

export default function BusinessSignInScreen({ onBack, onSignIn, onRegister }: Props) {
  const [recoveryPreview, setRecoveryPreview] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  return (
    <main className="grid min-h-screen bg-white font-[family-name:var(--font-ui)] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#171717] lg:block">
        <img
          src="/reference/d2aaaff55cdcccab.jpg"
          alt="A busy restaurant prepared for service"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/20" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white xl:p-16">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">fajify Business</p>
          <h1 className="mt-4 max-w-xl text-5xl font-black leading-[1.02] tracking-[-0.055em]">
            Your operation, clearly managed.
          </h1>
          <p className="mt-5 max-w-lg text-sm font-medium leading-6 text-white/70">
            Manage reservations, orders, availability, performance and payouts from one responsive workspace.
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
            <FajifyLogo suffix="Business" />
            <h2 className="mt-8 text-3xl font-black tracking-[-0.045em] text-[#1A1A1A]">Welcome back</h2>
            <p className="mt-2 text-sm font-medium text-[#777477]">Sign in to manage your business account.</p>
          </div>

          {recoveryPreview && <p role="status" className="mb-4 text-sm">Password recovery is a preview. No email will be sent. Use any sample email and password to explore.</p>}
          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault()
              onSignIn()
            }}
          >
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold text-[#4F4A4B]">Email address</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@business.com"
                className="h-14 rounded-2xl border border-[#E4E4E4] bg-[#FAFAFA] px-4 text-sm font-medium outline-none focus:border-[#FA3F38]"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold text-[#4F4A4B]">Password</span>
              <span className="flex h-14 items-center rounded-2xl border border-[#E4E4E4] bg-[#FAFAFA] px-4 focus-within:border-[#FA3F38]">
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
                <input type="checkbox" className="h-4 w-4 accent-[#FA3F38]" />
                Remember me
              </label>
              <button type="button" onClick={() => setRecoveryPreview(true)} className="text-xs font-bold text-[#FA3F38]">Forgot password?</button>
            </div>

            <button type="submit" className="mt-2 h-14 rounded-2xl bg-[#FA3F38] text-sm font-black text-white transition hover:bg-[#E9352F]">
              Sign in to Business
            </button>
          </form>

          <div className="mt-8 border-t border-[#EEEEEE] pt-7 text-center">
            <p className="text-sm font-medium text-[#777477]">New to fajify Business?</p>
            <button onClick={onRegister} className="mt-3 h-12 w-full rounded-2xl border border-[#DADADA] text-sm font-black text-[#1A1A1A] hover:border-[#FA3F38] hover:text-[#FA3F38]">
              Register your business
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
