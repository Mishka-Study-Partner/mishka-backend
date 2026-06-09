const { renderYourReportHtml } = require("./yourReportHtmlRenderer");

/** ISO A4 width — content is laid out to this width, then one tall page is emitted. */
const PDF_WIDTH_MM = 210;
/** 96 CSS px/in → A4 width in px for viewport layout. */
const PDF_WIDTH_PX = Math.round((PDF_WIDTH_MM / 25.4) * 96);

function pxToMm(px) {
  return (px * 25.4) / 96;
}

let browserPromise = null;

async function getBrowser() {
  if (browserPromise) return browserPromise;
  const puppeteer = require("puppeteer");
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  browserPromise = puppeteer.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  return browserPromise;
}

/**
 * @param {object} payload YourReportPayload
 * @returns {Promise<Buffer>}
 */
async function renderYourReportPdf(payload) {
  const html = renderYourReportHtml(payload);
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: PDF_WIDTH_PX, height: 2400, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);

    const contentHeightPx = await page.evaluate(() => {
      const root = document.querySelector(".page") || document.body;
      return Math.ceil(
        Math.max(
          root.scrollHeight,
          root.offsetHeight,
          document.body.scrollHeight,
          document.documentElement.scrollHeight
        )
      );
    });

    const pageHeightMm = pxToMm(contentHeightPx) + 0.5;

    await page.addStyleTag({
      content: `
        @page { size: ${PDF_WIDTH_MM}mm ${pageHeightMm}mm; margin: 0; }
        html, body, .page {
          width: ${PDF_WIDTH_MM}mm !important;
          max-width: ${PDF_WIDTH_MM}mm !important;
          overflow: hidden !important;
        }
        html, body { height: ${contentHeightPx}px !important; min-height: ${contentHeightPx}px !important; }
        .page { min-height: ${contentHeightPx}px !important; }
      `,
    });

    await page.emulateMediaType("print");

    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      displayHeaderFooter: false,
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

module.exports = { renderYourReportPdf, PDF_WIDTH_MM, PDF_WIDTH_PX };
