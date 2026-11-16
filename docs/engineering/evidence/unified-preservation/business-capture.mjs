import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

const origin = 'http://127.0.0.1:3056'
const screenshots = '/workspace/work/preservation-baselines/business-expanded'
if (screenshots) await mkdir(screenshots, { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
page.setDefaultTimeout(15000)
const errors = [], external = []
page.on('pageerror', error => errors.push(error.message))
page.on('request', request => { if (!request.url().startsWith(origin) && !request.url().startsWith('blob:') && !request.url().startsWith('data:')) external.push(request.url()) })
const button = (name, root = page) => root.getByRole('button', { name, exact: typeof name === 'string' })
async function capture(name) {
 const previous=page.viewportSize();
 for(const width of [390,768,1440]) {
  await page.setViewportSize({width,height:900});
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:`${screenshots}/${name}-${width}.png`,fullPage:true,animations:'disabled'});
 }
 await page.setViewportSize(previous);
}
async function dashboard() {
  await page.goto(origin)
  await button('Explore merchant demo →').click()
}
async function switchBusiness(name) {
  await button(/Switch business:/).click()
  await button(new RegExp(name), page.getByRole('dialog', { name: 'Switch business', exact: true })).click()
}
try {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(origin)
    await button('Sign in to Business').waitFor()
    await capture(`entry-${width}`)
    await button('Sign in to Business').click()
    await capture(`signin-${width}`)
    await button('Sign in to Business').click()
    await capture(`overview-${width}`)
    for (const tab of ['Reservations', 'Orders', 'Menu', 'Services']) {
      await button(tab).click()
      await capture(`${tab.toLowerCase()}-${width}`)
    }
    await button('Settings').click()
    await capture(`settings-${width}`)
  }
  console.log('PASS entry/sign-in/dashboard navigation, five tabs and settings at 390/768/1440')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(origin)
  await button('Register your business').click()
  assert.equal(await button('Continue').isDisabled(), true)
  for (let step = 1; step <= 8; step++) {
    if (step === 1) await button(/Restaurant \/ Bar/).click()
    if (step === 2) { await button('Table / Seat Reservations').click(); await button('In-venue Ordering').click() }
    if (step === 3) await button(/Small/).click()
    if (step === 4) {
      await page.getByRole('textbox', { name: 'Full Name', exact: true }).fill('Ada Demo')
      await page.getByRole('textbox', { name: 'Email Address', exact: true }).fill('ada@example.com')
      await page.getByRole('textbox', { name: 'Phone Number', exact: true }).fill('08012345678')
    }
    if (step === 5) {
      await page.getByRole('textbox', { name: 'Business Name', exact: true }).fill('Demo Bistro')
      await page.getByRole('textbox', { name: 'Business Address', exact: true }).fill('12 Demo Street, Lagos')
    }
    if (step === 6) {
      await button('National ID (NIN)').click()
      await button(/Use sample/).click()
      await button(/Take a selfie/).click()
    }
    if (step === 7) await page.getByRole('textbox', { name: 'LGA / Area', exact: true }).fill('Victoria Island')
    await capture(`onboarding-step-${step}`)
    if (step < 8) await button(/Continue/).click()
  }
  assert.match(await page.innerText('body'), /Demo Bistro/)
  await button('Submit Application').click()
  await button('Home').waitFor()
  console.log('PASS eight-step registration, simulated identity and review → fixture dashboard')

  for (const name of ['Landmark Beach', 'Filmhouse Cinemas', 'Zen Spa & Wellness', 'Quilox Nightclub', 'Shiro Lagos']) {
    await switchBusiness(name)
    await button(new RegExp(`Switch business: ${name.replace('&', '&')}`)).waitFor()
  }
  await button(/Business health score/).click()
  await page.getByRole('dialog', { name: 'Business health details' }).waitFor()
  await capture('business-health-mobile')
  await page.keyboard.press('Escape')
  assert.equal(await page.getByRole('dialog', { name: 'Business health details' }).count(), 0)
  console.log('PASS five-business switching, health detail and keyboard dismissal')

  await button('Reservations').click()
  await button('Next reservation month').click()
  await button('Previous reservation month').click()
  await button('Orders').click()
  await button('Accept').first().click()
  await button('New 0').waitFor()
  console.log('PASS reservation calendar and order status transition')

  await button('Home').click()
  await button('Add item').click()
  await page.getByRole('textbox', { name: 'Item name', exact: true }).fill('Demo tasting plate')
  await page.getByRole('combobox', { name: 'Item category', exact: true }).selectOption('Mains')
  await page.getByRole('textbox', { name: 'Price', exact: true }).fill('15000')
  await button('Save Item').click()
  await button('Menu').click()
  const item = page.getByRole('switch', { name: 'Availability of Demo tasting plate', exact: true })
  await item.click()
  assert.equal(await item.getAttribute('aria-checked'), 'false')
  await switchBusiness('Landmark Beach')
  await switchBusiness('Shiro Lagos')
  await button('Menu').click()
  assert.equal(await page.getByRole('switch', { name: 'Availability of Demo tasting plate', exact: true }).getAttribute('aria-checked'), 'false')
  console.log('PASS catalogue creation, availability and state across business switching')

  await button('Services').click()
  await page.getByRole('switch', { name: 'In-Venue Ordering', exact: true }).click()
  assert.equal(await button('Orders').count(), 0)
  await page.getByRole('switch', { name: 'In-Venue Ordering', exact: true }).click()
  await button('Orders').waitFor()
  console.log('PASS enabling/disabling merchant services updates navigation')

  await button('Home').click()
  await button('Scan QR').click()
  await button('Simulate scan').click()
  await button('Confirm demo check-in').click()
  await button('Guest checked in locally').waitFor()
  assert.equal(await button('Guest checked in locally').isDisabled(), true)
  await capture('qr-checkin-mobile')
  await button('Scan next').click()
  await button('Simulate scan').click()
  await page.getByText('Invalid Ticket', { exact: true }).waitFor()
  await button('Close QR scanner').click()
  console.log('PASS simulated valid check-in, duplicate protection and invalid ticket')

  await button('Settings').click()
  await button('Business Profile').click()
  await page.getByRole('textbox', { name: 'Business Name', exact: true }).fill('Shiro Demo Profile')
  await button('Save Changes').click()
  await button('Back to settings').click()
  await button('Staff & Access').click()
  const access = page.getByRole('switch', { name: 'Access for Adaeze Okonkwo', exact: true })
  await access.click()
  assert.equal(await access.getAttribute('aria-checked'), 'false')
  await button('+ Invite Staff Member').click()
  await page.getByRole('textbox', { name: 'Staff name', exact: true }).fill('Demo teammate')
  await button('Add demo staff').click()
  await page.getByRole('switch', { name: 'Access for Demo teammate', exact: true }).waitFor()
  await capture('staff-mobile')
  await button('Back to settings').click()
  await button('Help & Support').click()
  await button(/Email Support/).click()
  await page.getByRole('status').filter({ hasText: /No call, message or email is sent/ }).waitFor()
  await button('Back to settings').click()
  await button('← Back to Dashboard').click()
  await switchBusiness('Landmark Beach')
  await button('Settings').click()
  await button('Business Profile').click()
  assert.equal(await page.getByRole('textbox', { name: 'Business Name', exact: true }).inputValue(), '')
  await button('Back to settings').click()
  await button('← Back to Dashboard').click()
  await switchBusiness('Shiro Lagos')
  await button('Settings').click()
  await button('Business Profile').click()
  assert.equal(await page.getByRole('textbox', { name: 'Business Name', exact: true }).inputValue(), 'Shiro Demo Profile')
  console.log('PASS profile save/isolation, staff invite/access and simulated support')

  await button('Back to settings').click()
  await button('← Back to Dashboard').click()
  await button('Withdraw').click()
  await button('Continue').click()
  await capture('payout-review-mobile')
  await button('Confirm withdrawal').click()
  await page.getByText('Payout requested', { exact: true }).waitFor()
  assert.match(await page.innerText('body'), /Demo only/)
  await capture('payout-simulation-mobile')
  assert.deepEqual(errors, [], 'runtime errors')
  assert.deepEqual(external, [], 'external/API requests')
  console.log('PASS payout simulation; zero runtime errors and zero external requests')
} finally { await browser.close() }
