import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

// Start the production server first. No backend, credentials, or test API is used.
const origin = 'http://127.0.0.1:3055'
const screenshots = '/workspace/work/preservation-baselines/customer-expanded'
if (screenshots) await mkdir(screenshots, { recursive: true })
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
})
const errors = [], external = []
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
page.setDefaultTimeout(15000)
page.on('pageerror', error => errors.push(error.message))
page.on('request', request => {
  if (!request.url().startsWith(origin)) external.push(request.url())
})
const button = name => page.getByRole('button', { name, exact: typeof name === 'string' })
async function home() {
  await page.goto(origin)
  await button('Explore Lagos').click()
}
async function capture(name) {
 const previous=page.viewportSize();
 for(const width of [390,768,1440]) {
  await page.setViewportSize({width,height:900});
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:`${screenshots}/${name}-${width}.png`,fullPage:true,animations:'disabled'});
 }
 await page.setViewportSize(previous);
}
try {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(origin)
    await button('Explore Lagos').waitFor()
    await capture(`landing-${width}`)
    await button('Explore Lagos').click()
    await capture(`discovery-${width}`)
    await page.getByText('Shiro Lagos', { exact: true }).click()
    await capture(`venue-${width}`)
    await page.goBack()
    await page.getByRole('heading', { name: 'Recommended for you' }).waitFor()
    await page.goForward()
    await page.getByText('Shiro Lagos', { exact: true }).first().waitFor()
  }
  console.log('PASS responsive layouts and browser Back/Forward at 390/768/1440')

  await page.setViewportSize({ width: 390, height: 844 })
  await home()
  await page.getByText('Shiro Lagos', { exact: true }).click()
  await button(/Book a Reservation/).click()
  const dialog = page.getByRole('dialog', { name: 'Choose booking date and time' })
  await dialog.waitFor()
  await page.keyboard.press('Escape')
  assert.equal(await dialog.count(), 0)
  await button(/Book a Reservation/).click()
  // Choose an available day without depending on the current month.
  await dialog.locator('button.rounded-full').filter({ hasText: /^\d+$/ }).last().click()
  await button(/Continue —/).click()
  await button(/Evening/).click()
  await button(/Confirm —/).click()
  await button('Yes, Book a Ride').click()
  await button(/Confirm — ₦8,500/).click()
  assert.match(await page.innerText('body'), /53,000/)
  await button(/4242/).click()
  await capture('checkout-ride-mobile')
  await button(/Book Reservation/).click()
  await page.getByRole('dialog', { name: 'Demo ticket' }).waitFor()
  await capture('ticket-mobile')
  await button('Close').click()
  assert.match(await page.innerText('body'), /Shiro Lagos/)
  console.log('PASS date dialog Escape, booking date/time, ride pricing, checkout, QR ticket, bookings')

  await home()
  await button(/Art Lagos Festival/).click()
  await button('Join this Hangout').click()
  assert.match(await page.innerText('body'), /Art Lagos Festival/)
  console.log('PASS discovery event → local event ticket')

  await home()
  await page.getByText("Domino's Pizza", { exact: true }).click()
  await button('Add PEPPERONI').first().click()
  await button('View Cart').click()
  assert.match(await page.innerText('body'), /20,500/)
  await button('Proceed to Checkout').click()
  await button(/4242/).click()
  await capture('delivery-checkout-mobile')
  await button(/Place Order/).click()
  await page.getByText('Order Placed', { exact: true }).waitFor()
  await capture('order-tracking-mobile')
  console.log('PASS delivery selection → cart total → payment preview → order tracking')

  await page.goto(origin)
  await button(/Plan my night/).click()
  await button(/Date/).first().click()
  await capture('planner-'+(await page.locator('body').innerText()).slice(-140).replace(/[^a-z0-9]+/gi,'-'));
  await button('Continue').click()
  await capture('planner-'+(await page.locator('body').innerText()).slice(-140).replace(/[^a-z0-9]+/gi,'-'));
  await button('Continue').click()
  await button('Lekki').click()
  await capture('planner-'+(await page.locator('body').innerText()).slice(-140).replace(/[^a-z0-9]+/gi,'-'));
  await button('Continue').click()
  await button(/₦50k – ₦100k/).click()
  await capture('planner-'+(await page.locator('body').innerText()).slice(-140).replace(/[^a-z0-9]+/gi,'-'));
  await button('Continue').click()
  await button('Tomorrow').click()
  await capture('planner-'+(await page.locator('body').innerText()).slice(-140).replace(/[^a-z0-9]+/gi,'-'));
  await button('Continue').click()
  await button(/Romantic/).click()
  await button(/Show My Plans/).click()
  assert.match(await page.innerText('body'), /We found some plans/)
  await capture('planning-results-mobile')
  console.log('PASS complete six-step planning → matching plans')

  await home()
  await button('Planning actions').click()
  await button('Book a ride').click()
  await button('Yes, Book a Ride').click()
  await button(/Confirm Booking/).click()
  await button(/View My Booking/).click()
  assert.match(await page.innerText('body'), /Ride to Your destination/)
  console.log('PASS customer ride booking → local booking record')

  await home()
  await button('Planning actions').click()
  await button('Browse Plans').click()
  await page.getByRole('heading', { name: /Browse Plans/ }).waitFor()
  await capture('browse-plans-mobile')
  await home()
  await button('Planning actions').click()
  await button('Plan a hangout').click()
  await capture('create-hangout-mobile')
  await button(/Continue to Checkout/).click()
  await button(/View My Booking/).click()
  assert.match(await page.innerText('body'), /My Hangout/)
  console.log('PASS browse plans and hangout creation entry points')

  for (const menu of ['Offers & Promos', 'Invite Friends', 'Notifications', 'Help & Support', 'Settings']) {
    await home()
    await button('Profile').click()
    await button(new RegExp(menu.replace('&', '&'))).last().click()
    await capture('utility-'+menu.replace(/[^a-z]+/gi,'-'));
    assert.ok((await page.innerText('body')).length > 100)
  }
  console.log('PASS profile utility navigation')

  await page.goto(origin)
  await button('Toggle menu').click()
  await button('Sign in').click()
  assert.match(await page.innerText('body'), /Visual preview only/)
  await capture('auth-preview-mobile')
  assert.deepEqual(errors, [], 'browser runtime errors')
  assert.deepEqual(external, [], 'unexpected external/API requests')
  console.log('PASS visual authentication preview; zero runtime errors and zero external requests')
} finally { await browser.close() }
