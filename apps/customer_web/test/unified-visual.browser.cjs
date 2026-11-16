const {chromium}=require('playwright');const fs=require('fs');const assert=require('node:assert/strict');
const out=process.env.FAJI_WEB_SCREENSHOTS??require('node:path').resolve(__dirname,'../../..','docs/engineering/evidence/unified-implementation');
(async()=>{fs.mkdirSync(out+'/before',{recursive:true});fs.mkdirSync(out+'/after',{recursive:true});const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const p=await b.newPage({ignoreHTTPSErrors:true});p.setDefaultTimeout(30000);const records=[];
async function capture(path){await p.waitForLoadState('networkidle');await p.evaluate(()=>document.fonts.ready);await p.addStyleTag({content:'[data-design-review]{display:none!important}'});await p.screenshot({path,fullPage:true,animations:'disabled'});}
const screens=['landing','home','restaurant','planForMe','browsePlans','profile','settings','help','wishlist','myTickets','notifications','offers','inviteFriends','createEvent','onboarding','checkout','reservation','globalCart','confirmation','auth'];
await p.clock.setFixedTime(new Date('2026-11-16T12:00:00Z'));
for(const width of [390,768,1440]){
 await p.setViewportSize({width,height:900});
 for(const screen of screens){console.log('CAPTURE customer',screen,width);
  await p.goto('http://localhost:3055');await p.getByRole('button',{name:'Explore Lagos',exact:true}).waitFor();
  if(screen==='auth'){if(width<768){await p.getByRole('button',{name:'Toggle menu'}).click();}await p.getByRole('button',{name:'Sign in',exact:true}).first().click();}
  else if(screen!=='landing'){await p.evaluate(screen=>window.dispatchEvent(new PopStateEvent('popstate',{state:{...window.history.state,fajifyPreview:{mode:'customer',screen:screen==='restaurant'?{name:'restaurant',id:'v1'}:screen==='checkout'||screen==='reservation'?{name:screen,venueId:'v1'}:screen==='confirmation'?{name:screen,type:'reservation',details:{venueName:'Shiro Lagos',date:'Design reference only'}}:{name:screen}}}})),screen);}
  if(screen!=='landing')await p.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Explore Lagos'));
  await p.waitForTimeout(120);await capture(`${out}/before/customer-${screen}-${width}.png`);
  await p.goto(`https://localhost:3440/design-review/customer?screen=${screen}`);await p.locator('[data-design-review]').waitFor();await p.waitForFunction(()=>document.body.innerText.length>200);await p.waitForTimeout(120);await capture(`${out}/after/customer-${screen}-${width}.png`);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,screen+' overflow');records.push({screen,product:'customer',width,type:'retained source visual comparison; fixtures isolated'});
 }
 for(const screen of ['entry','signin','onboarding','dashboard']){
  await p.goto('http://localhost:3056');await p.getByRole('button',{name:'Sign in to Business',exact:true}).waitFor();if(screen==='signin')await p.getByRole('button',{name:'Sign in to Business',exact:true}).click();if(screen==='onboarding')await p.getByRole('button',{name:'Register your business',exact:true}).click();if(screen==='dashboard')await p.getByRole('button',{name:'Explore merchant demo →',exact:true}).click();await capture(`${out}/before/business-${screen}-${width}.png`);
  await p.goto(`https://localhost:3440/design-review/business?screen=${screen}`);await p.locator('[data-design-review]').waitFor();await p.waitForFunction(()=>document.body.innerText.length>300);await p.waitForTimeout(120);await capture(`${out}/after/business-${screen}-${width}.png`);records.push({screen,product:'business',width,type:'retained source visual comparison; fixtures isolated'});
 }
 console.log('PASS original and unified review captures at',width);
}
fs.writeFileSync(out+'/visual-captures.json',JSON.stringify(records,null,2));await b.close();})().catch(e=>{console.error(e);process.exit(1)});
