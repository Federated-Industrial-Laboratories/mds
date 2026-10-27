// SPDX-License-Identifier: Apache-2.0
// Exercise reader appearance with real browser storage, media preferences and layouts.
// Input: Playwright browser, documentation URL and optional capture path. Output: check names. Exit: throws on failure.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function checkAppearance(browser, url, captureDir) {
  const checks = [];
  const firefox = browser.browserType().name() === 'firefox';
  const contexts = [];
  const context = await browser.newContext({ viewport: { width: 1480, height: 1050 }, colorScheme: 'light' });
  context.setDefaultTimeout(10000);
  contexts.push(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const record = name => checks.push(name);
  const state = target => target.evaluate(() => ({ ...window.MDSPreferences.get() }));
  const open = async target => {
    await target.locator('#appearance-open').click();
    await target.locator('#appearance-dialog').waitFor({ state: 'visible' });
  };
  const close = async target => {
    await target.keyboard.press('Escape');
    await target.locator('#appearance-dialog').waitFor({ state: 'hidden' });
  };
  const fit = async (target, label) => {
    const dimensions = await target.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(dimensions.scroll <= dimensions.width + 1, `${label}: page width ${dimensions.scroll} exceeds viewport ${dimensions.width}`);
  };
  try {
    await page.goto(url);
    await page.locator('#appearance-open').waitFor({ state: 'visible' });
    const defaults = await page.evaluate(() => ({ ...window.MDSPreferences.defaults }));
    await open(page);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'appearance-palette');
    await close(page);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'appearance-open');
    record('Appearance dialog has keyboard focus and restores its trigger');

    assert.equal(await page.locator('#flat-appearance,#appearance-flat').count(),0);
    await open(page);
    await page.locator('#appearance-typography').selectOption('display');
    await page.locator('#appearance-finish').selectOption('flat');
    assert.equal((await state(page)).typography,'display');
    await page.locator('#appearance-typography').selectOption('standard');
    await close(page);
    assert.equal((await state(page)).finish, 'flat');
    assert.equal((await state(page)).typography, 'standard');
    const flat = await page.evaluate(() => ({
      material: getComputedStyle(document.querySelector('.panel-title')).backgroundImage,
      shadow: getComputedStyle(document.querySelector('.document-window')).boxShadow,
      text: getComputedStyle(document.querySelector('.docs-brand')).textShadow,
    }));
    assert.deepEqual(flat, { material: 'none', shadow: 'none', text: 'none' });
    await page.reload();
    assert.equal((await state(page)).finish, 'flat');
    record('Flat appearance removes materials and text effects and survives reload');

    await open(page);
    await page.locator('#appearance-finish').selectOption('metalheart');
    await page.locator('#appearance-typography').selectOption('standard');
    await page.locator('#appearance-palette').selectOption('neutral');
    await page.locator('#appearance-mode').selectOption('light');
    await page.locator('#appearance-contrast').selectOption('normal');
    await close(page);
    assert.ok((await page.locator('.panel-title').first().evaluate(node => getComputedStyle(node).backgroundImage)).includes('linear-gradient'));
    assert.equal(await page.locator('.docs-brand').evaluate(node => getComputedStyle(node).textShadow), 'none');
    record('Metal surfaces and standard typography are independent');
    if (captureDir) {
      await mkdir(captureDir, { recursive: true });
      await page.screenshot({ path: join(captureDir, 'appearance-metalheart.png'), fullPage: false });
      await open(page);
      await page.locator('#appearance-finish').selectOption('flat');
      await close(page);
      await page.screenshot({ path: join(captureDir, 'appearance-flat.png'), fullPage: false });
    }

    const second = await context.newPage();
    await second.goto(url);
    await second.locator('#appearance-open').waitFor({ state: 'visible' });
    const other = await context.newPage();
    const otherUrl = new URL(url);
    otherUrl.searchParams.set('mds-test-site', 'other');
    const original = await context.request.get(url);
    const otherHtml = (await original.text()).replace(/data-mds-site="[^"]*"/, 'data-mds-site="appearance-other-site"');
    await other.route(otherUrl.href, route => route.fulfill({ status: 200, headers: original.headers(), body: otherHtml }));
    await other.goto(otherUrl.href);
    await other.locator('#appearance-open').waitFor({ state: 'visible' });
    const otherBefore = await state(other);
    await open(page);
    await page.locator('#appearance-palette').selectOption('contrast');
    await page.locator('#appearance-mode').selectOption('dark');
    await close(page);
    await second.waitForFunction(() => window.MDSPreferences.get().palette === 'contrast' && window.MDSPreferences.get().mode === 'dark');
    assert.deepEqual(await state(other), otherBefore);
    await open(page);
    await page.locator('#appearance-reset').click();
    await close(page);
    assert.deepEqual(await state(page), defaults);
    await second.waitForFunction(expected => JSON.stringify(window.MDSPreferences.get()) === JSON.stringify(expected), defaults);
    await second.close();
    await other.close();
    record('Same-site tabs synchronise settings and reset without affecting another site ID');

    await page.evaluate(() => localStorage.setItem(window.MDSPreferences.key, JSON.stringify({ schemaVersion: 1, preferences: { palette: 'removed-theme', finish: 'flat', mode: 'dark' } })));
    await page.reload();
    assert.equal((await state(page)).palette, defaults.palette);
    assert.equal((await state(page)).finish, 'flat');
    await page.evaluate(() => localStorage.setItem(window.MDSPreferences.key, JSON.stringify({ schemaVersion: 999, preferences: { mode: 'dark' } })));
    await page.reload();
    assert.deepEqual(await state(page), defaults);
    await page.evaluate(() => localStorage.setItem(window.MDSPreferences.key, 'malformed'));
    await page.reload();
    assert.deepEqual(await state(page), defaults);
    record('Removed themes, unknown preference versions and malformed storage recover to valid defaults');

    await open(page);
    await page.locator('#appearance-palette').selectOption('neutral');
    await page.locator('#appearance-mode').selectOption('system');
    await page.locator('#appearance-contrast').selectOption('system');
    await close(page);
    await page.emulateMedia({ colorScheme: 'light' });
    const light = await page.locator('body').evaluate(node => getComputedStyle(node).backgroundColor);
    await page.emulateMedia({ colorScheme: 'dark' });
    const dark = await page.locator('body').evaluate(node => getComputedStyle(node).backgroundColor);
    assert.notEqual(light, dark);
    await page.emulateMedia({ contrast: 'more' });
    // Playwright Firefox 1543 updates new media queries but leaves existing CSS
    // and MediaQueryList instances stale after contrast/forced-colour emulation.
    // A fresh document checks these modes without asserting an untested OS change.
    if (firefox) await page.reload();
    await page.waitForFunction(() => matchMedia('(prefers-contrast:more)').matches && getComputedStyle(document.body).backgroundColor === 'rgb(0, 0, 0)');
    assert.equal(await page.locator('body').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(0, 0, 0)');
    await page.emulateMedia({ forcedColors: 'active' });
    if (firefox) await page.reload();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.panel-title')).backgroundImage === 'none');
    assert.equal(await page.locator('.panel-title').first().evaluate(node => getComputedStyle(node).backgroundImage), 'none');
    await page.locator('#appearance-open').focus();
    await page.keyboard.press('Enter');
    await page.locator('#appearance-dialog').waitFor({ state: 'visible' });
    const focus = await page.locator('#appearance-palette').evaluate(node => ({ outline: getComputedStyle(node).outlineStyle, border: getComputedStyle(node).borderStyle }));
    assert.notEqual(focus.outline, 'none');
    assert.notEqual(focus.border, 'none');
    await close(page);
    await page.emulateMedia({ forcedColors: 'none', contrast: 'no-preference', colorScheme: 'dark', media: 'print' });
    if (firefox) await page.reload();
    assert.equal(await page.locator('.markdown-body').evaluate(node => getComputedStyle(node).color), 'rgb(0, 0, 0)');
    assert.equal(await page.locator('.article-surface').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(255, 255, 255)');
    await page.emulateMedia({ media: 'screen', colorScheme: 'light' });
    if (firefox) await page.reload();
    record(firefox ? 'Live system colour changes; contrast, forced colours and print on fresh documents (Firefox emulation limitation)' : 'System colour and contrast changes, forced colours and dark-theme printing remain readable');

    for (const width of [320, 768, 1480]) {
      await page.setViewportSize({ width, height: 1000 });
      await fit(page, `Width ${width}`);
      await open(page);
      await fit(page, `Appearance dialog at width ${width}`);
      const dialogSize = await page.locator('#appearance-dialog').evaluate(node => ({ scroll: node.scrollWidth, width: node.clientWidth }));
      assert.ok(dialogSize.scroll <= dialogSize.width + 1, `Dialog content fits ${width}px`);
      await close(page);
    }
    await page.setViewportSize({ width: 800, height: 1000 });
    const spacingUrl = new URL('_mds/appearance-test-spacing.css', url.endsWith('/') ? url : `${url}/`).href;
    await page.route(spacingUrl, route => route.fulfill({ contentType: 'text/css', body: ':root{font-size:36px!important}body *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}' }));
    await page.addStyleTag({ url: spacingUrl });
    await fit(page, '200% text size and text-spacing overrides');
    await open(page);
    await fit(page, '200% text and spacing with appearance dialog');
    const clipped = await page.locator('#appearance-dialog').evaluate(node => node.scrollWidth > node.clientWidth + 1);
    assert.equal(clipped, false);
    await close(page);
    record('Mobile layouts and 200% text with spacing overrides retain usable controls');

    const denied = await browser.newContext({ viewport: { width: 900, height: 900 } });
    contexts.push(denied);
    await denied.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage denied', 'SecurityError'); } }));
    const deniedPage = await denied.newPage();
    await deniedPage.goto(url);
    await open(deniedPage);
    await deniedPage.locator('#appearance-finish').selectOption('flat');
    assert.equal((await state(deniedPage)).finish, 'flat');
    assert.ok((await deniedPage.locator('#appearance-status').textContent()).includes('Storage is unavailable'));
    await denied.close();
    contexts.splice(contexts.indexOf(denied), 1);
    record('Storage denial leaves appearance controls usable on the current page');

    const missingFont = await browser.newContext({ viewport: { width: 900, height: 900 } });
    contexts.push(missingFont);
    const fallbackPage = await missingFont.newPage();
    await fallbackPage.route('**/*.ttf', route => route.abort());
    await fallbackPage.goto(url);
    await open(fallbackPage);
    await fallbackPage.locator('#appearance-typography').selectOption('display');
    await close(fallbackPage);
    await fallbackPage.evaluate(() => document.fonts.ready);
    assert.ok(await fallbackPage.locator('.markdown-body h1').isVisible());
    await fit(fallbackPage, 'Display headings without the custom font');
    await missingFont.close();
    contexts.splice(contexts.indexOf(missingFont), 1);
    record('Display headings remain readable when the custom font fails');

    const noScript = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 900 }, colorScheme: 'dark' });
    contexts.push(noScript);
    const staticPage = await noScript.newPage();
    await staticPage.goto(url);
    assert.equal(await staticPage.locator('#appearance-open').isVisible(), false);
    assert.equal(await staticPage.locator('#search-open').isVisible(), false);
    assert.equal(await staticPage.locator('#navigation-menu').getAttribute('open'), '');
    await fit(staticPage, 'No JavaScript at 320px');
    assert.ok(await staticPage.locator('.markdown-body h1').isVisible());
    await noScript.close();
    contexts.splice(contexts.indexOf(noScript), 1);
    record('Static manuals remain navigable without JavaScript at a narrow viewport');
    assert.deepEqual(errors, [], 'Appearance workflows produce no browser exceptions');
    return checks;
  } finally {
    await Promise.allSettled(contexts.map(owned => owned.close()));
  }
}
