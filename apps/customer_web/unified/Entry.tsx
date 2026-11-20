'use client';

import {useEffect} from 'react';
import {usePages} from '@faji/web-ui/client';
import type {Schema} from '@faji/web-ui/types';
import {legacyDestination} from './legacy-navigation';
import LandingScreen from '../webapp/screens/LandingScreen';

export default function Entry(){
 useEffect(()=>{const target=legacyDestination(window.location.hash);if(target)window.location.replace(target);},[]);
 const venues=usePages<Schema<'VenuePage'>>('discovery/venues?limit=3');
 const liveVenues=(venues.data?.items??[]).map(venue=>({
  id:venue.id,
  name:venue.name,
  category:venue.businessName,
  location:venue.city||venue.address||'Location not published',
  rating:String(Number(venue.rating)),
  price:'View availability',
  image:'/reference/13f31cdb447e3f83.jpg',
 }));

 return <LandingScreen
  live
  venues={liveVenues}
  onExplore={()=>window.location.assign('/customer#home')}
  onSearch={()=>window.location.assign('/customer#home')}
  onGetStarted={()=>window.location.assign('/register')}
  onSignIn={()=>window.location.assign('/login')}
  onBusiness={()=>window.location.assign('/business')}
  onRide={()=>window.location.assign('/ride')}
  onVenue={id=>window.location.assign(`/customer#restaurant/${encodeURIComponent(id)}`)}
  onPlan={()=>window.location.assign('/customer#planForMe')}
 />;
}
