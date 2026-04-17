import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

async function resolveExecutablePath() {
  if (process.env.CHROME_EXECUTABLE_PATH) {
    return process.env.CHROME_EXECUTABLE_PATH
  }

  return chromium.executablePath()
}

export async function generatePdfFromHtml(html: string) {
  const executablePath = await resolveExecutablePath()

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    return Buffer.from(
      await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '18mm',
          right: '14mm',
          bottom: '18mm',
          left: '14mm',
        },
      }),
    )
  } finally {
    await browser.close()
  }
}
