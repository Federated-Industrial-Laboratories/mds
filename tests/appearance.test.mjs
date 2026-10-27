// SPDX-License-Identifier: Apache-2.0
// Check palette contrast and the persisted reader preference contract.
// Input: shipped themes and preference script. Output: test results. Exit: test runner status.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { catalog, themeCss } from '../themes/index.mjs';
import { template } from '../src/templates/document.mjs';

const luminance = hex => hex.slice(1).match(/../g).map(part => parseInt(part, 16) / 255)
  .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
  .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
const contrast = (a, b) => {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
};

test('all shipped palettes preserve text and essential control contrast on material endpoints', () => {
  for (const [name, theme] of Object.entries(catalog)) for (const mode of ['light', 'dark']) {
    const tokens = theme[mode];
    const backgrounds = ['background', 'surface', 'raised', 'inset', 'selected', 'metal-top', 'metal-middle', 'metal-bottom'];
    for (const foreground of ['text', 'muted-text', 'link']) for (const background of backgrounds) {
      const ratio = contrast(tokens[foreground], tokens[background]);
      assert.ok(ratio >= 4.5, `${name}/${mode}: ${foreground} on ${background}: ${ratio.toFixed(2)}:1`);
    }
    for (const foreground of ['focus', 'control-border']) for (const background of backgrounds) {
      const ratio = contrast(tokens[foreground], tokens[background]);
      assert.ok(ratio >= 3, `${name}/${mode}: ${foreground} on ${background}: ${ratio.toFixed(2)}:1`);
    }
    assert.ok(contrast(tokens['code-text'], tokens['code-background']) >= 4.5, `${name}/${mode}: code contrast`);
  }
});

test('theme output includes core fallbacks and only requested optional palettes', () => {
  const css = themeCss({ themes: ['aotx'], palette: 'aotx' });
  for (const id of ['neutral', 'contrast', 'aotx']) assert.ok(css.includes(`data-mds-palette="${id}"`));
  for (const id of ['fil', 'ficc', 'prism', 'cobalt', 'violet']) assert.ok(!css.includes(`data-mds-palette="${id}"`));
  assert.throws(() => themeCss({ themes: ['unknown'] }), /Unknown theme/);
  assert.throws(() => themeCss({ themes: [], palette: 'violet' }), /must be enabled/);
});

const script = await readFile(new URL('../src/browser/preferences.js', import.meta.url), 'utf8');
const defaults = { palette: 'aotx', mode: 'system', finish: 'metalheart', typography: 'standard', contrast: 'system' };
function preferences({ saved = null, denied = false, id = 'manuals' } = {}) {
  const dataset = { mdsSite: id, mdsThemes: 'neutral,contrast,aotx', mdsDefaults: JSON.stringify(defaults) };
  const events = new Map();
  const writes = new Map();
  const localStorage = {
    getItem: () => { if (denied) throw new Error('Storage denied'); return saved; },
    setItem: (key, value) => { if (denied) throw new Error('Storage denied'); writes.set(key, value); },
    removeItem: key => { if (denied) throw new Error('Storage denied'); writes.delete(key); },
  };
  const window = { addEventListener: (name, handler) => events.set(name, handler), dispatchEvent: () => {} };
  vm.runInNewContext(script, { document: { documentElement: { dataset } }, localStorage, window, CustomEvent: class {} });
  return { api: window.MDSPreferences, dataset, events, writes };
}
const json = value => JSON.parse(JSON.stringify(value));

test('saved settings are bounded, versioned and scoped to the site', () => {
  const a = preferences();
  const b = preferences({ id: 'other-site' });
  assert.notEqual(a.api.key, b.api.key);
  a.api.update({ finish: 'flat', typography: 'standard', palette: 'contrast' });
  const saved = a.writes.get(a.api.key);
  const restored = preferences({ saved });
  assert.equal(restored.dataset.mdsFinish, 'flat');
  assert.equal(restored.dataset.mdsPalette, 'contrast');
  assert.equal(restored.dataset.mdsMode, 'system');
  const reset = restored.api.reset();
  assert.deepEqual(json(reset.preferences), defaults);
});

test('invalid preferences and removed palettes fall back without breaking reading', () => {
  for (const saved of ['bad json', 'null', '{}', 'x'.repeat(2049), JSON.stringify({ schemaVersion: 99, preferences: { finish: 'flat' } })]) {
    assert.deepEqual(json(preferences({ saved }).api.get()), defaults);
  }
  const saved = JSON.stringify({ schemaVersion: 1, preferences: { palette: 'removed', finish: 'flat', mode: 'invalid' } });
  const reader = preferences({ saved });
  assert.equal(reader.api.get().palette, 'aotx');
  assert.equal(reader.api.get().finish, 'flat');
  assert.equal(reader.api.get().mode, 'system');
  assert.equal(reader.api.update({ unknown: 'value', palette: 'not-enabled' }).preferences.palette, 'aotx');
});

test('storage failure preserves current-page controls and cross-tab changes apply only to this site', () => {
  const reader = preferences({ denied: true });
  const result = reader.api.update({ finish: 'flat', typography: 'display' });
  assert.equal(result.stored, false);
  assert.equal(reader.dataset.mdsFinish, 'flat');
  assert.equal(reader.dataset.mdsTypography, 'display');
  reader.events.get('storage')({ key: 'another-site', newValue: null });
  assert.equal(reader.dataset.mdsFinish, 'flat');
  reader.events.get('storage')({ key: reader.api.key, newValue: JSON.stringify({ schemaVersion: 1, preferences: { palette: 'contrast', mode: 'dark' } }) });
  assert.equal(reader.dataset.mdsPalette, 'contrast');
  assert.equal(reader.dataset.mdsMode, 'dark');
  reader.events.get('storage')({ key: null, newValue: null });
  assert.deepEqual(json(reader.api.get()), defaults);
});

test('document shell keeps nested deployment paths and safely encodes project metadata', () => {
  const page = { source: 'docs/guide.md', slug: 'guide', label: 'Guide', group: 'Read', url: '/project/docs/guide/' };
  const html = template(page, { title: 'Guide', html: '<h1>Guide</h1>', headings: [] }, [page], {
    site: { id: 'demo', title: 'A < B', version: '1.0.0', language: 'en', channel: 'Preview', homeUrl: '/project/', footer: '<script>bad</script>', indexable: false },
    appearance: { ...defaults, themes: ['aotx'] },
    urls: { docs: '/project/docs/', assets: '/project/docs/_mds/', search: '/project/docs/search/' },
  });
  assert.ok(html.includes('src="/project/docs/_mds/preferences.js"'));
  assert.ok(html.includes('href="/project/docs/"'));
  assert.ok(!html.includes('href="/docs/"'));
  assert.ok(html.includes('A &lt; B'));
  assert.ok(html.includes('&lt;script&gt;bad&lt;/script&gt;'));
  assert.ok(html.includes('id="appearance-open" type="button" hidden'));
  assert.ok(html.includes('<noscript>'));
});
