'use client';
import {useEffect} from 'react';
import {legacyDestination} from './legacy-navigation';
import Link from 'next/link';
import styles from './entry.module.css';
function Icon({kind}:{kind:'user'|'business'|'ride'}) {
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind==='user'?<><circle cx="12" cy="7" r="3"/><path d="M4 21v-2c0-5 16-5 16 0v2H4Z"/></>:kind==='business'?<><path d="m3 10 2-7h14l2 7M5 13v8h14v-8M9 3l-1 7m7-7 1 7M3 10a3 3 0 0 0 5 2 3 3 0 0 0 4 0 3 3 0 0 0 4 0 3 3 0 0 0 5-2"/></>:<><path d="M2 5h13v12H2zM15 10h4l3 5v2h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>}</svg>;
}
export default function Entry(){
 useEffect(()=>{const target=legacyDestination(window.location.hash);if(target)window.location.replace(target);},[]);
 return <main className={styles.entry} aria-label="Choose your Fajify experience">
  <div className={styles.decoration} aria-hidden="true"/><div className={styles.dots} aria-hidden="true"/>
  <div className={styles.wordmark} aria-label="faji">faji</div>
  <section className={styles.intro}><h1>Plan. Book. Enjoy.</h1><p>Everything you need to make every<br className={styles.break}/> moment unforgettable.</p><span aria-hidden="true"/></section>
  <nav className={styles.sheet} aria-label="Fajify experiences">
   <Link className={styles.customer} href="/login"><Icon kind="user"/><span>Login as a user</span><span aria-hidden="true">›</span></Link>
   <div className={styles.divider}><span/>or<span/></div>
   <div className={styles.roles}><Link href="/business"><Icon kind="business"/><span>Faji Business</span></Link><Link href="/ride"><Icon kind="ride"/><span>Faji Ride</span></Link></div>
  </nav>
 </main>;
}
