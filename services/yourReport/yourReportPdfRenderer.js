const { renderYourReportHtml } = require("./yourReportHtmlRenderer");

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
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 60000 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "16mm", left: "10mm", right: "10mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

module.exports = { renderYourReportPdf };
