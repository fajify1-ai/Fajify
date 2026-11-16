"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="connected"><section className="connection-state"><h1>Connection unavailable</h1><p>We could not verify this session. Your account has not been changed.</p><button className="faji-primary" onClick={reset}>Try again</button><a href="/login">Sign in</a><a href="/">Homepage</a></section></main>}
