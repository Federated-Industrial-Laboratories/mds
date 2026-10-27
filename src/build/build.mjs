// SPDX-License-Identifier: Apache-2.0
// Build a complete static documentation tree and keep provenance outside its public root.
import { readFile, mkdir, mkdtemp, rm, open } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { gzipSync } from 'node:zlib';
import MiniSearch from 'minisearch';
import { loadConfig } from './config.mjs';
import { readSources } from '../sources/read.mjs';
import { hash, json, put, digests, exists, filesUnder, noSymlinks, atomicFile, replaceDirectory, verifyFiles } from './files.mjs';
import { renderDocument } from './render.mjs';
import { searchOptions, escapeHtml } from './common.mjs';
import { template } from '../templates/document.mjs';
import { themeCss } from '../../themes/index.mjs';
import { checkLinks, readBuildMetadata } from './check.mjs';
import { readBranding, brandingMetadata } from './branding.mjs';

const packageRoot = fileURLToPath(new URL('../../', import.meta.url));
const packageInfo = JSON.parse(await readFile(resolve(packageRoot,'package.json'),'utf8'));
const require = createRequire(import.meta.url);
const miniRoot = resolve(dirname(require.resolve('minisearch')), '../..');

async function assertOwnership(config) {
  if (await exists(config.internal.metadataPath)) {
    const metadata = await readBuildMetadata(config);
    await verifyFiles(config.internal.docsRoot, metadata.files);
  } else if ((await filesUnder(config.internal.docsRoot)).length) throw new Error('Output contains files MDS does not own. Choose an empty output directory.');
}

export async function build(file, options = {}) {
  const config = await loadConfig(file);
  const { docsRoot, metadataPath } = config.internal;
  await assertOwnership(config);
  const source = await readSources(config);
  const branding = await readBranding(config);
  config.brandingUrls = Object.fromEntries(Object.entries(branding).map(([key,item]) => [key,config.urls.docs + item.file]));
  if (options.dryRun) return { dryRun:true, pages:config.pages.length, output:docsRoot, revision:source.revision, sourceVerified:source.verified };
  await mkdir(dirname(metadataPath), {recursive:true});
  await noSymlinks(metadataPath + '.lock');
  const lock = await open(metadataPath + '.lock', 'wx').catch(error => { throw new Error(`Build is locked; finish the other build or remove its stale metadata lock: ${error.code}`); });
  let stage;
  try {
    await assertOwnership(config);
    await mkdir(dirname(docsRoot), {recursive:true});
    stage = await mkdtemp(docsRoot + '.build-');
    const routeMap = new Map(config.pages.map(page => [page.source,page.url]));
    for (const item of config.linkedSources || []) routeMap.set(item.source, config.urls.docs + item.path);
    for (const [name,url] of Object.entries(config.linkAliases || {})) routeMap.set(name,url);
    const sections = [], documents = [];
    for (const page of config.pages) {
      const input = source.entries.get(page.source);
      const document = renderDocument(input.content, page, routeMap, config.markdown);
      await put(stage, page.file, template(page, document, config.pages, config));
      documents.push({ source:page.source, url:page.url, file:page.file, title:document.title, sourceKind:input.kind, sha256:input.sha256, headings:document.headings });
      if (!['LICENSE','NOTICE'].includes(page.source) && page.format !== 'text') for (const section of document.sections) sections.push({ id:sections.length, title:document.title, group:page.group, ...section, text:section.text.replace(/\s+/g,' ').trim() });
    }
    for (const item of config.linkedSources || []) await put(stage, item.path, source.entries.get(item.source).bytes);
    const engine = new MiniSearch(searchOptions); engine.addAll(sections);
    const index = JSON.stringify(engine);
    await put(stage, 'search/index.json', index);
    await put(stage, 'search/minisearch.js', await readFile(resolve(miniRoot,'dist/es/index.js')));
    await put(stage, 'search/LICENSE.txt', await readFile(resolve(miniRoot,'LICENSE.txt')));
    await put(stage, 'search/common.js', await readFile(resolve(packageRoot,'src/build/common.mjs')));
    for (const name of ['preferences.js','docs.js','docs-search.js']) await put(stage, `_mds/${name}`, await readFile(resolve(packageRoot,'src/browser',name)));
    await put(stage, '_mds/docs.css', await readFile(resolve(packageRoot,'src/styles/docs.css')));
    await put(stage, '_mds/themes.css', themeCss(config.appearance));
    if (await exists(resolve(packageRoot,'assets'))) for (const name of await filesUnder(resolve(packageRoot,'assets'))) await put(stage, `_mds/${name}`, await readFile(resolve(packageRoot,'assets',name)));
    for (const item of Object.values(branding)) await put(stage,item.file,item.bytes);
    const notFound = { source:'', slug:'', label:'Page not found', group:'Documentation', url:config.urls.docs + '404.html' };
    await put(stage, '404.html', template(notFound, {title:'Page not found',html:`<h1>Page not found</h1><p>The requested page is unavailable. <a href="${escapeHtml(config.urls.docs)}">Open the documentation</a> or use the document menu.</p>`,headings:[],sections:[]}, config.pages, config));
    await put(stage, 'robots.txt', `User-agent: *\n${config.site.indexable ? 'Allow' : 'Disallow'}: /\n`);
    if (config.site.origin && config.site.indexable) await put(stage, 'sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${documents.map(doc => `<url><loc>${escapeHtml(config.site.origin + doc.url)}</loc></url>`).join('')}</urlset>\n`);
    const files = await digests(stage);
    const checks = await checkLinks(stage, config.urls.docs, files);
    const metadata = {
      schemaVersion:1, packageVersion:packageInfo.version, siteId:config.site.id, version:config.site.version,
      docsRoot, outputRoot:config.internal.outputRoot, docsUrl:config.urls.docs,
      configDigest:config.internal.configDigest, documents, files, branding:brandingMetadata(branding),
      source:{type:source.type,revision:source.revision,tag:source.tag,verified:source.verified,files:Object.fromEntries([...source.entries].map(([name,item]) => [name,item.sha256])),publicationEdits:source.publicationEdits},
      search:{sections:sections.length,indexBytes:Buffer.byteLength(index),indexGzipBytes:gzipSync(index).length}
    };
    await assertOwnership(config);
    await replaceDirectory(stage, docsRoot, () => atomicFile(metadataPath, json(metadata)));
    stage = null;
    return { ...checks, documents:documents.length, files:Object.keys(files).length, output:docsRoot, metadata:metadataPath, revision:source.revision, sourceVerified:source.verified, search:metadata.search };
  } finally {
    if (stage) await rm(stage, {recursive:true,force:true});
    await lock.close(); await rm(metadataPath + '.lock', {force:true});
  }
}
