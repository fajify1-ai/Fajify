import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.BUSINESS_WEB_TEST_URL??'https://localhost:3443';
const output=process.env.WEB_EVIDENCE_DIR??'../../docs/engineering/evidence/customer-business-web';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});const context=await browser.newContext({ignoreHTTPSErrors:true});const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 const email=process.env.BUSINESS_TEST_EMAIL??`business-web-${Date.now()}@example.test`,password=process.env.BUSINESS_TEST_PASSWORD??'Disposable-test-browser-2026!';
 await page.goto(base+(process.env.BUSINESS_TEST_EMAIL?'/login':'/register'));
 if(!process.env.BUSINESS_TEST_EMAIL)await page.getByLabel('Name',{exact:true}).fill('Web Verification Merchant');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);if(!process.env.BUSINESS_TEST_EMAIL)await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.waitForURL('**/dashboard');
 if(!process.env.BUSINESS_TEST_EMAIL){
  await page.getByRole('heading',{name:'Business approval',exact:true}).waitFor();await page.getByRole('button',{name:'Register a business',exact:true}).click();
  for(let step=1;step<=8;step++){
   if(step===1)await page.getByRole('button',{name:/Restaurant \/ Bar/}).click();
   if(step===2)await page.getByRole('button',{name:'Table / Seat Reservations',exact:true}).click();
   if(step===3)await page.getByRole('button',{name:/Small/}).click();
   if(step===4){await page.getByLabel('Full Name',{exact:true}).fill('Verification Merchant');await page.getByLabel('Email Address',{exact:true}).fill(email);await page.getByLabel('Phone Number',{exact:true}).fill('+2348012345678');}
   if(step===5){await page.getByLabel('Business Name',{exact:true}).fill('Disposable Browser Bistro');await page.getByLabel('Business Address',{exact:true}).fill('Local test address');}
   if(step===7)await page.getByLabel('LGA / Area',{exact:true}).fill('Lagos');
   if([1,6,8].includes(step))await page.screenshot({path:`${output}/business-onboarding-step-${step}.png`,fullPage:true});
   if(step<8)await page.getByRole('button',{name:/Continue/}).click();
  }
  await page.getByRole('button',{name:'Submit Application',exact:true}).click();await page.getByRole('heading',{name:'Business approval',exact:true}).waitFor();await page.getByText(/Application .*pending/).waitFor();
  const identity=await (await page.request.get(base+'/api/platform/auth/me')).json();const application=await page.getByLabel('Existing application reference').inputValue();
  if(process.env.BUSINESS_TEST_FIXTURE_FILE)await writeFile(process.env.BUSINESS_TEST_FIXTURE_FILE,JSON.stringify({email,password,subject:identity.subject,application}));
  assert.equal(identity.memberships.length,0);
 }else{
  await page.getByRole('heading',{name:'Dashboard',exact:true}).waitFor();
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Branches',exact:true}).click();
  await page.getByLabel('Branch name',{exact:true}).fill('Browser Verification Branch');await page.getByLabel('Address',{exact:true}).fill('Disposable Lagos address');await page.getByLabel('Contact email',{exact:true}).fill(email);await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByText('Saved by the server.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByLabel('Name',{exact:true}).fill('Browser Verification Service');await page.locator('select[name=kind]').selectOption('service');await page.getByLabel('Price (NGN)',{exact:true}).fill('2500.00');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('heading',{name:'Browser Verification Service'}).first().waitFor();
  const freeName='Browser Free Seat '+Date.now();
  await page.getByLabel('Name',{exact:true}).fill(freeName);await page.locator('select[name=kind]').selectOption('service');await page.getByLabel('Price (NGN)',{exact:true}).fill('0');
  const createdPromise=page.waitForResponse(response=>response.url().endsWith('/catalogue')&&response.request().method()==='POST');await page.getByRole('button',{name:'Save changes',exact:true}).click();const created=await (await createdPromise).json();
  const card=page.locator('article').filter({has:page.getByRole('heading',{name:freeName,exact:true})});await card.getByRole('button',{name:'Publish',exact:true}).click();await card.getByRole('button',{name:'Unpublish',exact:true}).waitFor();
  await page.getByRole('button',{name:'Reservations',exact:true}).click();await page.locator('select[name=catalogueId]').selectOption(created.id);await page.locator('input[name=start]').fill(new Date(Date.now()+86400000).toISOString().slice(0,16));await page.locator('input[name=end]').fill(new Date(Date.now()+90000000).toISOString().slice(0,16));await page.locator('input[name=capacity]').fill('20');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByText('Saved by the server.',{exact:true}).waitFor();
  if(process.env.BUSINESS_TEST_OFFERING_FILE)await writeFile(process.env.BUSINESS_TEST_OFFERING_FILE,JSON.stringify({id:created.id}));
  await page.getByRole('button',{name:'Home',exact:true}).click();
  for(const width of [390,768,1440]){await page.setViewportSize({width,height:1000});await page.screenshot({path:`${output}/business-dashboard-${width}.png`,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  for(const tab of ['Reservations','Orders','Menu','Services']){await page.getByRole('button',{name:tab,exact:true}).first().click();await page.getByRole('heading',{name:tab,exact:true}).waitFor();}
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Branches',exact:true}).click();await page.getByRole('heading',{name:'Branches',exact:true}).waitFor();
  await page.screenshot({path:`${output}/business-branches.png`,fullPage:true});
 }
 assert.equal((await page.request.get(base+'/api/platform/customer/profile')).status(),404);assert.equal((await page.request.post(base+'/api/platform/business/onboarding/foreign/review')).status(),404);await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForURL('**/login');await page.goto(base+'/dashboard');await page.waitForURL('**/login');assert.equal((await page.request.get(base+'/design-preview')).status(),404);assert.deepEqual(errors,[]);console.log('PASS Business: '+(process.env.BUSINESS_TEST_EMAIL?'approved membership, dashboard/operational/settings navigation, responsive screenshots':'registration, eight onboarding steps, real pending application, no approval escalation')+', API isolation and no page errors.');
}finally{await browser.close();}
