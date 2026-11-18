import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
const {createElement}=React;
// The shared package is transformed as classic JSX by the standalone Node runner.
Object.assign(globalThis,{React});
import {renderToStaticMarkup} from 'react-dom/server';
import {AuthForm} from '@faji/web-auth/form';
test('registration and recovery render accessible required credentials without a demo bypass',()=>{
 const registration=renderToStaticMarkup(createElement(AuthForm,{mode:'register'}));
 assert.match(registration,/autocomplete="new-password"/i);assert.match(registration,/minLength="12"/i);assert.match(registration,/<label>Email/);assert.match(registration,/required/);assert.match(registration,/Terms &amp; Conditions/i);assert.doesNotMatch(registration,/demo|sample account/i);
 const recovery=renderToStaticMarkup(createElement(AuthForm,{mode:'recover'}));assert.match(recovery,/Recover your account/);assert.doesNotMatch(recovery,/name="password"/);
});
