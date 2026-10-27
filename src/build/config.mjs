// SPDX-License-Identifier: Apache-2.0
// Validate project configuration and resolve shared file and URL boundaries.
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import Ajv from 'ajv';
import { contains, noSymlinks, safeRelative, hash } from './files.mjs';

const schema = JSON.parse(await readFile(new URL('../../schemas/config.schema.json', import.meta.url), 'utf8'));
const validate = new Ajv({ allErrors: true, strict: true }).compile(schema);

export function publicUrl(value, { relative = true } = {}) {
  if (typeof value !== 'string' || /[\x00-\x20\\]/.test(value) || value.startsWith('//')) throw new Error(`Unsafe public URL: ${value}`);
  if (relative && value.startsWith('/')) return value;
  const parsed = new URL(value);
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error(`Use a public HTTP(S) URL: ${value}`);
  return value;
}

export async function loadConfig(file = 'mds.config.json') {
  file = resolve(file);
  await noSymlinks(file);
  const bytes = await readFile(file);
  const raw = JSON.parse(bytes);
  if (!validate(raw)) throw new Error(`Invalid MDS configuration: ${validate.errors.map(e => `${e.instancePath || '/'} ${e.message}`).join('; ')}`);
  const root = dirname(file);
  const config = structuredClone(raw);
  config.site = { language: 'en-GB', description: '', channel: 'preview', indexable: false, ...raw.site };
  config.paths = { basePath: '/', docsPath: 'docs/', output: '_site', metadata: '.mds/build.json', ...raw.paths };
  config.appearance = { themes: [], palette: 'neutral', mode: 'system', finish: 'metalheart', typography: 'standard', contrast: 'system', ...raw.appearance };
  config.appearance.themes = [...new Set(['neutral', 'contrast', ...config.appearance.themes])];
  if (!config.appearance.themes.includes(config.appearance.palette)) throw new Error('Default palette must be in the enabled theme catalogue.');
  config.markdown = { html: false, stripRepositoryChrome: false, ...raw.markdown };
  for (const key of ['homeUrl', 'repositoryUrl', 'editBaseUrl', 'origin']) if (config.site[key]) publicUrl(config.site[key], { relative: key === 'homeUrl' });
  if (config.site.origin) {
    const origin = new URL(config.site.origin);
    if (origin.pathname !== '/' || origin.search || origin.hash) throw new Error('Site origin must contain only scheme and host.');
    config.site.origin = origin.origin;
  }
  const { basePath, docsPath } = config.paths;
  if (!basePath.startsWith('/') || !basePath.endsWith('/') || basePath.startsWith('//')) throw new Error('basePath must start and end with a single slash.');
  safeRelative(basePath.slice(1, -1), { empty: true });
  if (docsPath && !docsPath.endsWith('/')) throw new Error('docsPath must be empty or end with a slash.');
  safeRelative(docsPath.replace(/\/$/, ''), { empty: true });
  config.urls = { docs: basePath + docsPath, assets: basePath + docsPath + '_mds/', search: basePath + docsPath + 'search/' };
  config.pages = config.navigation.flatMap(group => group.pages.map(page => ({ ...page, group: group.title, url: config.urls.docs + (page.slug ? page.slug + '/' : ''), file: (page.slug ? page.slug + '/' : '') + 'index.html' })));
  const sources = new Set(), routes = new Set();
  for (const page of config.pages) {
    safeRelative(page.source);
    if (['_mds', 'search'].includes(page.slug.split('/')[0])) throw new Error(`Reserved route: ${page.slug}`);
    if (sources.has(page.source) || routes.has(page.url)) throw new Error('Duplicate document source or route.');
    sources.add(page.source); routes.add(page.url);
  }
  if (!config.pages.some(page => page.slug === '')) throw new Error('Navigation must declare a documentation home page with an empty slug.');
  const published = new Set(config.pages.map(page => page.file));
  for (const entry of config.linkedSources || []) {
    safeRelative(entry.source); safeRelative(entry.path);
    if (entry.path.startsWith('_mds/') || entry.path.startsWith('search/') || ['404.html','sitemap.xml','robots.txt'].includes(entry.path) || published.has(entry.path)) throw new Error(`Reserved or duplicate output: ${entry.path}`);
    if (sources.has(entry.source)) throw new Error(`Duplicate source: ${entry.source}`);
    sources.add(entry.source); published.add(entry.path);
  }
  for (const [name, target] of Object.entries(config.linkAliases || {})) {
    safeRelative(name); publicUrl(target);
    if (sources.has(name)) throw new Error(`Link alias shadows a declared source: ${name}`);
  }
  for (const [name, local] of Object.entries(config.siteSources || {})) {
    safeRelative(name); safeRelative(local);
    if (!config.pages.some(page => page.source === name)) throw new Error(`Undeclared site-authored page: ${name}`);
  }
  for (const edit of config.publicationEdits || []) if (!config.pages.some(page => page.source === edit.source)) throw new Error(`Publication edit targets an unknown page: ${edit.source}`);
  const outputRoot = resolve(root, config.paths.output);
  const docsRoot = resolve(outputRoot, docsPath);
  const sourceRoot = resolve(root, config.source.root);
  const metadataPath = resolve(root, config.paths.metadata);
  if (docsRoot === root || contains(docsRoot, root) || contains(docsRoot, sourceRoot) || contains(sourceRoot, docsRoot)) throw new Error('Generated output must not overlap the project or source root.');
  if (contains(outputRoot, metadataPath)) throw new Error('Build metadata must stay outside the public output root.');
  for (const target of [docsRoot, metadataPath]) await noSymlinks(target);
  for (const local of Object.values(config.siteSources || {})) if (contains(docsRoot, resolve(root, local))) throw new Error('Site-authored inputs overlap generated output.');
  config.internal = { file, root, raw, configDigest: hash(bytes), sourceRoot, outputRoot, docsRoot, metadataPath };
  return config;
}
