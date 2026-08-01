import { chromium } from 'playwright'

const consoleErrors = []
const browser = await chromium.launch({ args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + String(err)))

await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1200)
const enterBtn = await page.$('button:has-text("Enter")')
if (enterBtn) await enterBtn.click()
await page.waitForTimeout(1500)

const activeAtTop = await page.evaluate(() => document.querySelector('.stop-nav-item.is-active .stop-nav-label')?.textContent)
console.log('Active stop at top:', activeAtTop)

const labels = ['About', 'Entrepreneur', 'Experience', 'Case Studies', 'Certificates', 'Education', 'Skills', 'Volunteering', 'Testimonials', 'Contact']
for (const label of labels) {
  await page.evaluate((l) => {
    const btn = [...document.querySelectorAll('.stop-nav-item')].find((b) => b.getAttribute('aria-label') === l)
    btn.click()
  }, label)
  await page.waitForTimeout(1600)
  const active = await page.evaluate(() => document.querySelector('.stop-nav-item.is-active .stop-nav-label')?.textContent)
  console.log(`Clicked "${label}" -> active: "${active}"`, active === label ? 'OK' : 'MISMATCH')
}

await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForTimeout(500)
const totalHeight = await page.evaluate(() => document.body.scrollHeight)
const steps = 50
const seen = []
for (let i = 0; i <= steps; i++) {
  const y = Math.floor((totalHeight * i) / steps)
  await page.evaluate((yy) => window.scrollTo(0, yy), y)
  await page.waitForTimeout(120)
  const active = await page.evaluate(() => document.querySelector('.stop-nav-item.is-active .stop-nav-label')?.textContent)
  if (seen[seen.length - 1] !== active) seen.push(active)
}
console.log('Sequence of active stops top to bottom:', JSON.stringify(seen))

// Confirm no overlap anywhere: every stop's rect should not intersect its neighbors
const allIds = ['pin-moon', 'pin-saturn', 'pin-mars', 'pin-venus', 'pin-constellations', 'pin-asteroids', 'pin-satellites', 'pin-jupiter', 'pin-testimonials', 'pin-earth']
const rects = await page.evaluate((ids) => ids.map((id) => {
  const el = document.getElementById(id)
  const rect = el.getBoundingClientRect()
  return { id, top: window.scrollY + rect.top, bottom: window.scrollY + rect.bottom }
}), allIds)
let overlapFound = false
for (let i = 0; i < rects.length - 1; i++) {
  if (rects[i].bottom > rects[i + 1].top) {
    overlapFound = true
    console.log(`OVERLAP: ${rects[i].id} (ends ${rects[i].bottom}) overlaps ${rects[i + 1].id} (starts ${rects[i + 1].top})`)
  }
}
console.log('Overlap found:', overlapFound)

console.log('Console errors:', JSON.stringify(consoleErrors))
await browser.close()
