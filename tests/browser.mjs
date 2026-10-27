// SPDX-License-Identifier: Apache-2.0
// Qualify reader workflows in real browsers; inputs are optional runtime paths, outputs are reports, exit is 0 or 1.
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { build, preview, init, check } from '../src/index.mjs';
import { json, hash } from '../src/build/files.mjs';
import { checkAppearance } from './appearance-browser.mjs';

const evidence = resolve(process.env.MDS_CAPTURE || join(tmpdir(),'mds-browser-checks'));
await mkdir(evidence,{recursive:true});
const fixture = await mkdtemp(join(tmpdir(),'mds-browser-site-'));
const reports = [], servers = [];
let browser;
async function record(name, action) {
  const result = await action();
  reports.push({name,status:'pass',...(result || {})});
  console.log(`PASS ${name}`);
}
async function scan(page, name) {
  const result = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  if (result.violations.length) await writeFile(join(evidence,`${name}-axe.json`),json(result.violations));
  assert.deepEqual(result.violations.map(item => ({id:item.id,nodes:item.nodes.map(node=>node.target)})),[],`${name} accessibility violations`);
  return {rules:result.passes.length,incomplete:result.incomplete.map(item=>item.id)};
}

try {
  await init(fixture,{write:true});
  const fixtureFile = join(fixture,'mds.config.json');
  const config = JSON.parse(await readFile(fixtureFile,'utf8'));
  config.paths.basePath = '/project/'; config.paths.docsPath = 'manuals/';
  config.branding = {logo:'logo.svg',darkLogo:'logo-dark.svg'};
  const logo = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#174f7d" d="M8 8h48v48H8z"/></svg>';
  await writeFile(join(fixture,'logo.svg'),logo);
  await writeFile(join(fixture,'logo-dark.svg'),logo.replace('#174f7d','#ffffff'));
  await writeFile(fixtureFile,json(config));
  await build(fixtureFile);
  const fixturePreview = await preview(fixtureFile,{port:0}); servers.push(fixturePreview.server);
  const ownFile = resolve(process.env.MDS_BROWSER_CONFIG || 'mds.config.json');
  await build(ownFile);
  await check(ownFile);
  const ownPreview = await preview(ownFile,{port:0}); servers.push(ownPreview.server);
  const engines = {chromium,firefox,webkit};
  const selected = (process.env.MDS_BROWSERS || 'chromium,firefox,webkit').split(',');
  for (const name of selected) {
    assert.ok(engines[name],`Unknown browser ${name}`);
    browser = await engines[name].launch({headless:true,...(name === 'chromium' ? {args:['--no-sandbox'],...(process.env.MDS_CHROME_EXECUTABLE ? {executablePath:process.env.MDS_CHROME_EXECUTABLE} : {})} : {})});
    const context = await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',...(name === 'chromium' ? {permissions:['clipboard-read','clipboard-write']} : {})});
    context.setDefaultTimeout(10000);
    const page = await context.newPage();
    const errors = [], requests = [];
    page.on('pageerror',error => errors.push(error.message));
    page.on('request',request => requests.push(request.url()));
    await record(`${name}: subpath reading, lazy search and keyboard navigation`,async () => {
      await page.goto(fixturePreview.url);
      assert.equal(await page.locator('.markdown-body h1').count(),1);
      assert.ok(!requests.some(url => url.endsWith('/search/index.json')),'Search is lazy');
      await page.locator('#search-open').click();
      await page.locator('#search-input').fill('task');
      await page.locator('#search-results a').first().waitFor();
      assert.ok(new URL(await page.locator('#search-results a').first().getAttribute('href'),fixturePreview.url).pathname.startsWith('/project/manuals/'));
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);
      assert.equal(await page.evaluate(()=>document.activeElement.closest('#search-results')?.id),'search-results');
      await page.keyboard.press('Escape');
      await page.locator('#search-dialog').waitFor({state:'hidden'});
      assert.equal(await page.evaluate(()=>document.activeElement.id),'search-open');
      await page.locator('#search-open').click();
      await page.locator('#search-input').fill('task');
      await page.keyboard.press('Escape');
      await page.locator('#search-dialog').waitFor({state:'hidden'});
      assert.equal(await page.evaluate(()=>document.activeElement.id),'search-open');
      await page.locator('.nav-group a').last().click();
      assert.match(page.url(),/\/project\/manuals\/first-task\//);
      await page.locator('.copy-code').first().click();
      if (name === 'chromium') {
        assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),await page.locator('.code-panel code').first().textContent());
      } else {
        const copied = await page.locator('.copy-code').first().textContent();
        assert.ok(['Copied','Selected'].includes(copied));
        if (copied === 'Selected') assert.equal(await page.evaluate(()=>getSelection().toString()),await page.locator('.code-panel code').first().textContent());
      }
      assert.ok(requests.every(url => new URL(url).origin === new URL(fixturePreview.url).origin),'Runtime assets stay local');
      assert.deepEqual(errors,[]);
      return {browserVersion:browser.version()};
    });
    await record(`${name}: project identity survives appearance changes`,async () => {
      await page.goto(fixturePreview.url);
      const light = page.locator('.brand-logo-light'), dark = page.locator('.brand-logo-dark');
      assert.ok((await light.getAttribute('src')).startsWith('/project/manuals/_mds/branding/'));
      assert.ok(await light.evaluate(image => image.complete && image.naturalWidth > 0));
      await page.locator('#appearance-open').click();
      await page.locator('#appearance-mode').selectOption('dark');
      await page.locator('#appearance-close').click();
      assert.equal(await dark.isVisible(),true);
      assert.equal(await light.isVisible(),false);
      await page.locator('#appearance-open').click();
      await page.locator('#appearance-finish').selectOption('flat');
      await page.locator('#appearance-close').click();
      assert.equal(await dark.isVisible(),true);
      await page.locator('#appearance-open').click();
      await page.locator('#appearance-mode').selectOption('light');
      await page.locator('#appearance-close').click();
      assert.equal(await light.isVisible(),true);
      assert.equal(await dark.isVisible(),false);
      assert.equal(await page.locator('.docs-brand').getAttribute('aria-label'),'Example documentation Documentation home');
    });
    await record(`${name}: failed search index recovery`,async () => {
      await page.goto(fixturePreview.url);
      await page.route('**/search/index.json',route=>route.abort());
      await page.locator('#search-open').click();
      await page.locator('#search-retry').waitFor({state:'visible'});
      assert.equal(await page.locator('#search-retry').textContent(),'Try again');
      await page.unroute('**/search/index.json');
      await page.locator('#search-retry').click();
      await page.locator('#search-input').fill('task');
      await page.locator('#search-results a').first().waitFor();
      await page.keyboard.press('Escape');
    });
    await record(`${name}: failed search module reload recovery`,async () => {
      await page.route('**/_mds/docs-search.js',route=>route.abort());
      await page.goto(fixturePreview.url);
      await page.locator('#search-open').click();
      await page.locator('#search-retry').waitFor({state:'visible'});
      assert.equal(await page.locator('#search-retry').textContent(),'Reload page');
      await page.unroute('**/_mds/docs-search.js');
      await page.locator('#search-retry').click();
      await page.locator('#search-open').click();
      await page.locator('#search-input').fill('task');
      await page.locator('#search-results a').first().waitFor();
      await page.keyboard.press('Escape');
    });
    await record(`${name}: error route and private metadata exclusion`,async () => {
      assert.equal((await page.goto(fixturePreview.url + 'missing/')).status(),404);
      assert.equal(await page.locator('.markdown-body h1').textContent(),'Page not found');
      const response = await context.request.get(new URL('/project/.mds/build.json',fixturePreview.url).href);
      assert.equal(response.status(),404);
    });
    await record(`${name}: MDS manuals, semantic accessibility and mobile reading`,async () => {
      await page.goto(ownPreview.url + 'gallery/');
      await page.setViewportSize({width:320,height:900});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1));
      await page.setViewportSize({width:1440,height:1000});
      if (name === 'chromium') {
        const first = await scan(page,'metalheart');
        await page.locator('#appearance-open').click();
        await page.locator('#appearance-finish').selectOption('flat');
        await page.locator('#appearance-close').click();
        await scan(page,'flat');
        await page.locator('#appearance-open').click();
        await page.locator('#appearance-palette').selectOption('violet');
        await page.locator('#appearance-mode').selectOption('dark');
        await scan(page,'appearance-dialog');
        await page.locator('#appearance-close').click();
        await scan(page,'dark-violet');
        return first;
      }
    });
    await context.close();
    await record(`${name}: appearance, storage, system preferences and no-JavaScript workflows`,async () => ({checks:await checkAppearance(browser,ownPreview.url,join(evidence,name))}));
    await browser.close(); browser = null;
  }
  await writeFile(join(evidence,'result.json'),json({status:'pass',node:process.version,packageLock:hash(await readFile('package-lock.json')),reports}));
  console.log(`Browser evidence: ${evidence}`);
} catch (error) {
  await writeFile(join(evidence,'failure.json'),json({status:'fail',reports,error:error.stack}));
  throw error;
} finally {
  if (browser) await browser.close();
  await Promise.all(servers.map(server=>new Promise(resolve=>server.close(resolve))));
  await rm(fixture,{recursive:true,force:true});
}
