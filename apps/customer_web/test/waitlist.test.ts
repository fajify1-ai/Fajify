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
 assert.match(html,/class="waitlist-photo"/);
 assert.match(html,/waitlist\/fajify-logo-primary-horizontal\.svg/);
 assert.match(html,/href="#waitlist"/);
 assert.match(html,/id="waitlist"/);
});

test('waitlist form requests email and phone without claiming a signup was saved',()=>{
 const html=renderToStaticMarkup(React.createElement(WaitlistForm));
 assert.match(html,/type="email"/);
 assert.match(html,/type="tel"/);
 assert.match(html,/name="email"/);
 assert.match(html,/name="whatsapp"/);
 assert.match(html,/\+234/);
 assert.match(html,/Save my spot/);
 assert.doesNotMatch(html,/You’re on the list|Welcome to the first fam/);
});
