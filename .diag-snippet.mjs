import { chromium } from 'playwright'
const browser = await chromium.launch({ args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1200)
const enterBtn = await page.$('button:has-text("Enter")')
if (enterBtn) await enterBtn.click()
await page.waitForTimeout(1500)
await page.$eval('button[aria-label="Case Studies"]', (b) => b.click())
await page.waitForTimeout(1500)

console.log('--- Scenario A: collapsed (fresh load, nothing expanded) ---')
const a = await page.evaluate(() => {
  const b = document.querySelector('#pin-venus .card-body--expanded, #pin-venus .card-body')
  return { scrollHeight: b?.scrollHeight, clientHeight: b?.clientHeight, textStart: b?.textContent?.trim().slice(0, 50) }
})
console.log(JSON.stringify(a))

console.log('--- Scenario B: after expanding the visible card ---')
await page.evaluate(() => {
  const cards = [...document.querySelectorAll('#pin-venus .scroll-card')]
  const v = cards.find((c) => parseFloat(getComputedStyle(c).opacity) > 0.9)
  v.querySelector('.card-read-more').click()
})
await page.waitForTimeout(400)
const b = await page.evaluate(() => {
  const el = document.querySelector('#pin-venus .card-body--expanded, #pin-venus .card-body')
  return { scrollHeight: el?.scrollHeight, clientHeight: el?.clientHeight, textStart: el?.textContent?.trim().slice(0, 50) }
})
console.log(JSON.stringify(b))

await browser.close()
