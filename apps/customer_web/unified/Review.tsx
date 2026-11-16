'use client';
import dynamic from 'next/dynamic';
import type {Screen,AppMode} from '../webapp/App';
const Customer=dynamic(()=>import('../webapp/App'),{ssr:false});
const Business=dynamic(()=>import('@faji/business-web/webapp/App'),{ssr:false});
const customerScreens:Record<string,Screen>={home:{name:'home'},onboarding:{name:'onboarding'},restaurant:{name:'restaurant',id:'v1'},checkout:{name:'checkout',venueId:'v1'},reservation:{name:'reservation',venueId:'v1'},eventDetail:{name:'eventDetail',id:'e1'},planForMe:{name:'planForMe'},browsePlans:{name:'browsePlans'},profile:{name:'profile'},settings:{name:'settings'},help:{name:'help'},wishlist:{name:'wishlist'},myTickets:{name:'myTickets'},notifications:{name:'notifications'},offers:{name:'offers'},inviteFriends:{name:'inviteFriends'},createEvent:{name:'createEvent'},globalCart:{name:'globalCart'},cart:{name:'cart',venueId:'v1'},confirmation:{name:'confirmation',type:'reservation',details:{venueName:'Shiro Lagos',date:'Design reference only'}}};
export default function Review({business,screen}:{business:boolean;screen:string}){
 const mode:AppMode=screen==='auth'?'customer-auth':screen==='landing'?'landing':'customer';
 const businessMode=screen==='onboarding'?'onboarding':screen==='signin'?'signin':screen==='entry'?'entry':'dashboard';
 return <><aside data-design-review role="note" style={{position:'fixed',top:0,left:0,right:0,zIndex:10000,padding:6,background:'#fff1f0',color:'#771d18',fontSize:12,textAlign:'center'}}>Design review · Fictional local data only · No real booking, payment, payout or check-in · <a href="/">Exit review</a></aside>{business?<div data-business-experience style={{display:'contents'}}><Business initialMode={businessMode}/></div>:<Customer deferRide initialMode={mode} initialScreen={customerScreens[screen]??{name:'home'}}/>}</>;
}
