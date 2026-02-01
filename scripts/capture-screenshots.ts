import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
import { join } from 'path'

const SCREENSHOTS_DIR = join(__dirname, '../docs/screenshots')
const BASE_URL = 'http://localhost:5173'

const screenshots = [
  {
    name: '01-dashboard-overview',
    description: 'Dashboard overview with map, alerts, and vessel panel',
    url: BASE_URL,
    waitFor: 3000, // Wait for map to load
  },
  {
    name: '02-map-with-vessels',
    description: 'Map display showing real-time vessel positions from AIS',
    url: BASE_URL,
    waitFor: 5000, // Wait for AIS data
  },
  {
    name: '03-vessel-panel',
    description: 'Vessel information panel with details',
    url: BASE_URL,
    waitFor: 5000,
    before: async (page) => {
      // Try to click on a vessel marker if one appears
      await page.waitForTimeout(5000)
      const markers = await page.locator('.maplibregl-marker').count()
      if (markers > 0) {
        await page.locator('.maplibregl-marker').first().click()
      }
    },
  },
  {
    name: '04-alert-feed',
    description: 'Alert feed showing position discrepancies',
    url: BASE_URL,
    waitFor: 3000,
    viewport: { width: 1920, height: 1080 },
  },
  {
    name: '05-layer-controls',
    description: 'Map layer controls for AIS/Radar/Fused data',
    url: BASE_URL,
    waitFor: 2000,
  },
]

async function captureScreenshots() {
  console.log('🚀 Starting screenshot capture...')

  // Create screenshots directory
  await mkdir(SCREENSHOTS_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  })
  const page = await context.newPage()

  for (const screenshot of screenshots) {
    console.log(`📸 Capturing: ${screenshot.name}...`)

    await page.goto(screenshot.url)
    await page.waitForTimeout(screenshot.waitFor)

    if (screenshot.before) {
      await screenshot.before(page)
    }

    const screenshotPath = join(SCREENSHOTS_DIR, `${screenshot.name}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: false })

    console.log(`   ✅ Saved: ${screenshotPath}`)
  }

  await browser.close()
  console.log('✨ Screenshot capture complete!')
}

captureScreenshots().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
