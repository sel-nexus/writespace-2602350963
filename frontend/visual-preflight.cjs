/** Capture representative UI evidence against an already-running configured server. */
const { chromium } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function main() {
  const config = (await import(pathToFileURL(path.join(__dirname, 'playwright.config.js')).href)).default;
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || config.use.baseURL;
  const output = path.resolve(process.env.VISUAL_PREFLIGHT_DIR || path.join(__dirname, 'visual-preflight-output'));
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chromium' });
  const evidence = [];
  try {
    for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
      const context = await browser.newContext({ baseURL, viewport: { width: viewport.width, height: viewport.height } });
      try {
        const page = await context.newPage();
        async function capture(state) {
          const filename = `${viewport.name}-${state}.png`;
          await page.screenshot({ path: path.join(output, filename), fullPage: true });
          let accessibility;
          if (page.accessibility && typeof page.accessibility.snapshot === 'function') {
            accessibility = await page.accessibility.snapshot({ interestingOnly: false });
          } else {
            const cdp = await context.newCDPSession(page);
            try { accessibility = await cdp.send('Accessibility.getFullAXTree'); }
            finally { await cdp.detach(); }
          }
          const styles = await page.evaluate(() => Array.from(document.querySelectorAll('body, header, nav, main, h1, h2, button, a, input, textarea')).map((element) => {
            const style = getComputedStyle(element);
            return { tag: element.tagName, text: (element.innerText || element.getAttribute('aria-label') || '').trim().slice(0, 100), color: style.color, backgroundColor: style.backgroundColor, fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight, lineHeight: style.lineHeight, display: style.display, padding: style.padding, margin: style.margin };
          }));
          evidence.push({ viewport, state, url: page.url(), screenshot: filename, accessibility, styles, html: await page.content() });
        }
        await page.goto('/');
        await capture('landing-empty');
        await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Login' }).click();
        await page.getByRole('button', { name: 'Login' }).click();
        await page.getByRole('alert').waitFor();
        await capture('login-error');
        await page.getByLabel('Username').fill('admin');
        await page.getByLabel('Password').fill('admin');
        await page.getByRole('button', { name: 'Login' }).click();
        await page.getByRole('heading', { name: 'Admin dashboard' }).waitFor();
        await capture('admin');
        if (viewport.name === 'mobile') {
          await page.getByRole('button', { name: 'Toggle navigation menu' }).click();
          await capture('navigation-open');
        }
      } finally { await context.close(); }
    }
    await fs.writeFile(path.join(output, 'visual-preflight.txt'), JSON.stringify({ baseURL, evidence }, null, 2), 'utf8');
    console.log(`Visual evidence written to ${output}`);
  } finally { await browser.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
