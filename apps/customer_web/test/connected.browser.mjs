import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base=process.env.CUSTOMER_WEB_TEST_URL??'https://localhost:3440';
const output=process.env.WEB_EVIDENCE_DIR??'../../docs/engineering/evidence/customer-business-web';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const context=await browser.newContext({ignoreHTTPSErrors:true});
const page=await context.newPage();
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(base+'/customer');await page.getByRole('button',{name:'Browse Plans',exact:true}).first().click();await assert.equal(await page.getByText('Browse Plans',{exact:true}).count()>0,true);
 await page.getByRole('button',{name:'Plan for Me',exact:true}).first().click();await page.getByText('Date',{exact:true}).first().waitFor();
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:1000});await page.screenshot({path:`${output}/customer-planner-${width}.png`,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');}
 await page.goto(base+'/login');await page.getByRole('button',{name:'Sign in',exact:true}).click();assert.equal(await page.locator('input:invalid').count()>0,true);
 await page.goto(base+'/register');const email=`customer-web-${Date.now()}@example.test`;
 await page.getByLabel('Full name',{exact:true}).fill('Web Verification Customer');await page.getByLabel('Email address',{exact:true}).fill(email);await page.getByLabel('Phone number',{exact:true}).fill('+2348012345678');await page.getByLabel('Password',{exact:true}).fill('Disposable-test-browser-2026!');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Create account',exact:true}).click();await page.waitForURL('**/customer');await page.goto(base+'/customer#profile');await page.getByRole('heading',{name:'Web Verification Customer',exact:true}).waitFor();await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('heading',{name:'My account',exact:true}).waitFor();
 await page.getByLabel('Display name',{exact:true}).fill('Verified Customer');await page.getByRole('button',{name:'Save profile',exact:true}).click();await page.getByText('Profile saved.',{exact:true}).waitFor();
 const profile=await page.request.get(base+'/api/platform/customer/profile');assert.equal(profile.status(),200);assert.equal((await profile.json()).displayName,'Verified Customer');
 // The unified host forwards both product contracts; Nest must deny foreign merchant scope.
 assert.equal((await page.request.get(base+'/api/platform/businesses/00000000-0000-4000-8000-000000000000/finance')).status(),403);assert.equal((await page.request.post(base+'/api/platform/customer/rides')).status(),404);
 await page.getByRole('button',{name:'Bookings & orders',exact:true}).click();await page.waitForURL(/#myTickets$/);await page.getByRole('heading',{name:'Bookings & orders',exact:true}).waitFor();
 await page.getByRole('button',{name:'My account',exact:true}).click();await page.getByRole('button',{name:'Help & Support',exact:true}).click();await page.getByLabel('Subject',{exact:true}).fill('Disposable verification');await page.getByLabel('Message',{exact:true}).fill('Local browser integration test only.');await page.getByRole('button',{name:'Send support request'}).click();await page.getByText('Support request received.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Discover',exact:true}).first().click();for(const width of [390,768,1440]){await page.setViewportSize({width,height:1000});await page.screenshot({path:`${output}/customer-discovery-${width}.png`,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 if(process.env.CUSTOMER_TEST_OFFERING_ID){await page.goto(base+'/customer#offering/'+process.env.CUSTOMER_TEST_OFFERING_ID);await page.getByLabel('Guest name',{exact:true}).fill('Web Verification Customer');const times=page.locator('select');await times.locator('option').nth(1).waitFor({state:'attached'});await times.selectOption({index:1});await page.getByRole('button',{name:'Reserve a place',exact:true}).click();await page.getByRole('status').filter({hasText:/Reservation .*confirmed/}).waitFor();const reservations=await (await page.request.get(base+'/api/platform/customer/reservations')).json();assert.ok(reservations.items.some(value=>value.status==='confirmed'));await page.screenshot({path:`${output}/customer-confirmed-reservation.png`,fullPage:true});}
 await page.goto(base+'/account-security');await page.getByRole('heading',{name:/security/i}).first().waitFor();await page.screenshot({path:`${output}/customer-security.png`,fullPage:true});
 await page.goto(base+'/customer#profile');await page.getByRole('button',{name:'Log Out',exact:true}).click();await page.waitForURL(base+'/');assert.equal((await page.request.get(base+'/api/platform/customer/profile')).status(),401);await page.goto(base+'/dashboard');await page.waitForURL('**/login');assert.equal((await page.request.get(base+'/design-preview')).status(),404);
 assert.deepEqual(errors,[]);console.log('PASS Customer: planning navigation, registration/session, profile persistence, support creation, bookings navigation, API isolation, required forms, responsive screenshots, security page, no page errors.');
}finally{await browser.close();}
