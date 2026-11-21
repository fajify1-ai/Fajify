import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import CustomerAuthScreen from '../webapp/screens/CustomerAuthScreen';
import BusinessSignInScreen from '../../business_web/webapp/screens/BusinessSignInScreen';
import {AuthForm} from '@faji/web-auth/form';
import BusinessEntry from '@faji/business-web/webapp/components/BusinessEntry';
import {SecuritySettings} from '@faji/web-auth/security';
import DeferredDelivery from '../unified/DeferredDelivery';
Object.assign(globalThis,{React});
test('restored real credential forms require credentials and keep fixture bypass outside real mode',()=>{
 const customer=renderToStaticMarkup(React.createElement(CustomerAuthScreen,{initialMode:'register',onBack(){},onComplete(){},authenticate:async()=>{}}));
 assert.match(customer,/We simplify the planning/);assert.match(customer,/minLength="12"/);assert.match(customer,/autocomplete="new-password"/i);assert.doesNotMatch(customer,/Visual preview only/);
 const merchant=renderToStaticMarkup(React.createElement(BusinessSignInScreen,{onBack(){},onSignIn(){},onRegister(){},authenticate:async()=>{}}));
 assert.match(merchant,/Your operation/);assert.match(merchant,/autocomplete="current-password"/i);assert.match(merchant,/required/);
});
test('deferred delivery renders no form and never claims a message was delivered',()=>{
 const html=renderToStaticMarkup(React.createElement(DeferredDelivery));assert.match(html,/currently disabled/);assert.doesNotMatch(html,/<form/);assert.match(html,/No code or recovery message has been sent/);
});

test('original credential adapter retains the existing optional MFA challenge',()=>{
 const html=renderToStaticMarkup(React.createElement(AuthForm,{mode:'login',initialSecondFactor:true,returnTo:'/business/dashboard'}));
 assert.match(html,/Verify your second factor/);assert.match(html,/one-time-code/);assert.doesNotMatch(html,/name="password"/);
});

test('design review is inaccessible by default before rendering any fixture',async()=>{
 const {middleware}=await import('../middleware');const {NextRequest}=await import('next/server');const previous=process.env.FAJI_DESIGN_REVIEW;
 try{delete process.env.FAJI_DESIGN_REVIEW;assert.equal(middleware(new NextRequest('https://faji.test/design-review/business')).status,404);process.env.FAJI_DESIGN_REVIEW='1';assert.equal(middleware(new NextRequest('https://faji.test/design-review/business')).headers.get('x-middleware-next'),'1');}finally{if(previous===undefined)delete process.env.FAJI_DESIGN_REVIEW;else process.env.FAJI_DESIGN_REVIEW=previous;}
});


test('delivery policy blocks reset and SMS transports while preserving password and TOTP auth',async()=>{
 const {requiresDeferredDelivery}=await import('../unified/delivery-policy');
 for(const path of ['request-password-reset','reset-password','phone-number/send-otp','phone-number/verify','two-factor/send-otp','verify-email'])assert.equal(requiresDeferredDelivery('/api/auth/'+path),true,path);
 for(const path of ['sign-in/email','sign-up/email','sign-out','get-session','two-factor/verify-totp','two-factor/verify-backup-code','faji/step-up'])assert.equal(requiresDeferredDelivery('/api/auth/'+path),false,path);
});


test('public Business entry reuses the original composition and opens real workspace actions',()=>{
 const html=renderToStaticMarkup(React.createElement(BusinessEntry,{preview:false,onSignIn(){},onRegister(){},onExplore(){}}));
 assert.match(html,/Your operation/);assert.match(html,/d2aaaff55cdcccab.jpg/);assert.match(html,/Business workspace/);assert.doesNotMatch(html,/Explore merchant demo/);
});


test('legacy Customer deep links remain on-origin and keep planning screens separate',async()=>{
 const {legacyDestination}=await import('../unified/legacy-navigation');
 assert.equal(legacyDestination('#planForMe'),'/customer#planForMe');assert.equal(legacyDestination('#browsePlans'),'/customer#browsePlans');assert.equal(legacyDestination('#restaurant/venue-id'),'/customer#restaurant/venue-id');assert.equal(legacyDestination('#transportation'),'/ride');assert.equal(legacyDestination('#//outside.test'),null);assert.equal(legacyDestination('https://outside.test'),null);
});


test('shared security retains merchant navigation and disables delivery controls without removing authenticator MFA',()=>{
 const html=renderToStaticMarkup(React.createElement<NonNullable<React.ComponentProps<typeof SecuritySettings>>>(SecuritySettings,{deliveryDeferred:true,workspaceHref:'/business/dashboard'}));
 assert.match(html,/href="\/business\/dashboard"/);assert.match(html,/href="\/business\/login"/);assert.match(html,/Enroll authenticator/);assert.match(html,/disabled=""[^>]*>Send phone OTP/);
});


test('Customer invitation return targets preserve only local validated one-use token routes',async()=>{
 const {customerReturnTo}=await import('../unified/return-to');
 const target='/customer#inviteFriends/'+'ab'.repeat(32);
 assert.equal(customerReturnTo(target),target);
 for(const value of ['https://evil.example','//evil.example','/business/dashboard','/customer#inviteFriends/not-a-token',null,['/customer']])assert.equal(customerReturnTo(value),'/customer#home');
});

test('Customer profile keeps its themed shell while loading and uses supplied live activity counts',async()=>{
 const previousWindow=globalThis.window,previousDocument=globalThis.document;
 Object.assign(globalThis,{
  window:{matchMedia:()=>({matches:true,addEventListener(){}})},
  document:{documentElement:{setAttribute(){}}},
 });
 try{
  const {default:ProfileScreen}=await import('../webapp/screens/ProfileScreen');
  const common={navigate(){},onLogout(){},activity:{bookings:12,bookingsMore:false,events:5,eventsMore:false,reviews:8,reviewsMore:false,loading:false}};
  const loading=renderToStaticMarkup(React.createElement(ProfileScreen,{...common,loading:true}));
  assert.match(loading,/Loading your profile/);assert.match(loading,/Account activity/);assert.doesNotMatch(loading,/class="connection-state"/);
  const loaded=renderToStaticMarkup(React.createElement(ProfileScreen,{...common,profile:{displayName:'Alex Johnson',email:'alex@example.test'}}));
  assert.match(loaded,/Alex Johnson/);assert.match(loaded,/alex@example\.test/);assert.match(loaded,/>12</);assert.match(loaded,/>5</);assert.match(loaded,/>8</);assert.doesNotMatch(loaded,/>3</);
 }finally{
  if(previousWindow===undefined)delete (globalThis as {window?:Window}).window;else Object.assign(globalThis,{window:previousWindow});
  if(previousDocument===undefined)delete (globalThis as {document?:Document}).document;else Object.assign(globalThis,{document:previousDocument});
 }
});

test('Browse Plans keeps loading, errors, empty results, filters, and published plans distinct',async()=>{
 const previousWindow=globalThis.window,previousDocument=globalThis.document;
 Object.assign(globalThis,{
  window:{matchMedia:()=>({matches:false,addEventListener(){}})},
  document:{documentElement:{setAttribute(){}}},
 });
 try{
  const {default:BrowsePlansScreen}=await import('../webapp/screens/BrowsePlansScreen');
  const loading=renderToStaticMarkup(React.createElement(BrowsePlansScreen,{navigate(){},livePlans:[],loading:true}));
  assert.match(loading,/Loading available plans/);assert.doesNotMatch(loading,/No plans available yet/);
  const failed=renderToStaticMarkup(React.createElement(BrowsePlansScreen,{navigate(){},livePlans:[],error:'Plans are temporarily unavailable.',onRetry(){}}));
  assert.match(failed,/Plans are temporarily unavailable/);assert.doesNotMatch(failed,/No plans available yet/);
  const empty=renderToStaticMarkup(React.createElement(BrowsePlansScreen,{navigate(){},livePlans:[],activeBudget:'All Plans'}));
  assert.match(empty,/No plans available yet/);assert.match(empty,/Published plans from Fajify businesses/);
  const filtered=renderToStaticMarkup(React.createElement(BrowsePlansScreen,{navigate(){},livePlans:[{id:'package-1',name:'Published package',image:'',inclusions:['Included service'],price:120000,currency:'NGN',minPeople:2,maxPeople:4,category:'package'}],activeBudget:'Under ₦100k',hasAppliedFilters:true,onClearFilters(){}}));
  assert.match(filtered,/No plans match these filters/);assert.match(filtered,/Clear filters/);assert.doesNotMatch(filtered,/No plans available yet/);
  const available=renderToStaticMarkup(React.createElement(BrowsePlansScreen,{navigate(){},livePlans:[{id:'package-1',name:'Published package',image:'',inclusions:['Included service'],price:120000,currency:'NGN',minPeople:2,maxPeople:4,category:'package'}],activeBudget:'All Plans',onBook(){}}));
  assert.match(available,/Published package/);assert.match(available,/View plan/);assert.match(available,/2–4 guests/);assert.doesNotMatch(available,/\/reference\//);
 }finally{
  if(previousWindow===undefined)delete (globalThis as {window?:Window}).window;else Object.assign(globalThis,{window:previousWindow});
  if(previousDocument===undefined)delete (globalThis as {document?:Document}).document;else Object.assign(globalThis,{document:previousDocument});
 }
});

test('connected original checkout excludes sample bank/card and ride workflows without fabricating a ticket',async()=>{
 const oldWindow=globalThis.window,oldDocument=globalThis.document;
 Object.assign(globalThis,{window:{matchMedia:()=>({matches:false,addEventListener(){}})},document:{documentElement:{setAttribute(){}}}});
 try{
 const {default:Checkout}=await import('../webapp/screens/CheckoutScreen');
 const html=renderToStaticMarkup(React.createElement(Checkout,{venueId:'real-offering',navigate(){},connected:{venue:{name:'Connected venue',location:'Published branch',image:'/reference/2b62efd44783a784.jpg',inclusions:[],date:'Future scheduled date',time:'18:00',guests:'1 Guest',basePrice:0,discount:0},guests:1,onEdit(){},onPay(){},busy:false,canPay:true,payment:React.createElement('p',{},'Provider checkout only'),status:null,actionLabel:'Reserve a place'}}));
 assert.match(html,/Connected venue/);assert.match(html,/Provider checkout only/);assert.match(html,/Coming Soon/);
 assert.doesNotMatch(html,/Ada Okonkwo|4242|GTBank|0123456789|FAJI:BOOKING:|Booking Confirmed!/);
 }finally{Object.assign(globalThis,{window:oldWindow,document:oldDocument});}
});

test('connected original reservation calendar uses actual slots and price rather than the static September fixture',async()=>{
 const {default:Reservation}=await import('../webapp/screens/ReservationScreen');
 const html=renderToStaticMarkup(React.createElement(Reservation,{venueId:'real-offering',navigate(){},live:{slots:[{id:'real-slot',startsAt:'2027-01-18T10:00:00Z',remaining:3}],selectedSlot:'real-slot',selectSlot(){},guests:1,setGuests(){},price:'₦0.00',status:null,onContinue(){}}}));
 assert.match(html,/January 2027 18/);assert.match(html,/Number of guests/);assert.match(html,/₦0.00/);assert.doesNotMatch(html,/40,000/);assert.match(html,/<option value="0" selected="">Jan<\/option>/);assert.match(html,/<option selected="">2027<\/option>/);
});
