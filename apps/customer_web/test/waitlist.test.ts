import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import WaitlistPage from '../app/waitlist/page';
import WaitlistForm from '../app/waitlist/WaitlistForm';
import BusinessWaitlistPage from '../app/businesswaitlist/page';
import BusinessWaitlistLanding from '../app/businesswaitlist/BusinessWaitlistLanding';

Object.assign(globalThis,{React});

test('waitlist page includes the responsive landing content and branded assets',()=>{
 const html=renderToStaticMarkup(React.createElement(WaitlistPage));
 assert.match(html,/Good times\./);
 assert.match(html,/Made simple\./);
 assert.match(html,/Not everyone gets in early/);
 assert.match(html,/Join now for early access/);
 assert.doesNotMatch(html,/We’ll send launch news/);
 assert.match(html,/class="waitlist-photo"/);
 assert.match(html,/waitlist\/fajify-logo-primary-horizontal\.svg/);
 assert.match(html,/href="#waitlist"/);
 assert.match(html,/id="waitlist"/);
});

test('waitlist form collects contact consent and explains how details are used',()=>{
 const html=renderToStaticMarkup(React.createElement(WaitlistForm));
 assert.match(html,/type="email"/);
 assert.match(html,/type="tel"/);
 assert.match(html,/name="email"/);
 assert.match(html,/name="whatsapp"/);
 assert.match(html,/\+234/);
 assert.match(html,/Save my spot/);
 assert.match(html,/type="checkbox"[^>]*required/);
 assert.match(html,/name="consent"/);
 assert.match(html,/I agree Fajify may contact me by email and WhatsApp/);
 assert.match(html,/early-access and launch updates/);
 assert.doesNotMatch(html,/not connected|not saved|opens soon/);
});

test('business waitlist route follows the partner design and uses the official brand assets',()=>{
 const html=renderToStaticMarkup(React.createElement(BusinessWaitlistPage));
 assert.match(html,/Your passion\./);
 assert.match(html,/Made profitable\./);
 assert.match(html,/Every type of/);
 assert.match(html,/We don’t just list you/);
 assert.match(html,/fajify-logo-primary-horizontal\.svg/);
 assert.match(html,/fajify-partner-recruitment\.png/);
 assert.match(html,/id="business-waitlist-partner"/);
});

test('business signup includes API-backed category, contact and explicit consent fields',()=>{
 const html=renderToStaticMarkup(React.createElement(BusinessWaitlistLanding));
 assert.match(html,/name="businessName"/);
 assert.match(html,/name="category"/);
 assert.match(html,/party_event_organizer/);
 assert.match(html,/restaurant_lounge/);
 assert.match(html,/event_venue/);
 assert.match(html,/fun_recreation/);
 assert.match(html,/name="email"/);
 assert.match(html,/name="whatsapp"/);
 assert.match(html,/<input[^>]*required[^>]*name="consent"/);
 assert.match(html,/Register my business/);
 assert.match(html,/partner updates from Fajify/);
});
