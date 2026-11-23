import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import WaitlistPage from '../app/waitlist/page';
import WaitlistForm from '../app/waitlist/WaitlistForm';

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
