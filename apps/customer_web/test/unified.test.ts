import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import CustomerAuthScreen from '../webapp/screens/CustomerAuthScreen';
import BusinessSignInScreen from '../../business_web/webapp/screens/BusinessSignInScreen';
import {AuthForm} from '@faji/web-auth/form';
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
