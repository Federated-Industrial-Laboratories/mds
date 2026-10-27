// SPDX-License-Identifier: Apache-2.0
// Check publication bytes, navigation targets and the source state behind a build.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseDocument } from 'htmlparser2';
import { loadConfig } from './config.mjs';
import { readSources } from '../sources/read.mjs';
import { hash, noSymlinks, readWithin, safeRelative, verifyFiles } from './files.mjs';
import { readBranding, brandingMetadata } from './branding.mjs';

export function elements(html) {
  const result = [];
  function visit(node) { if (node.name && node.attribs) result.push(node); for (const child of node.children || []) visit(child); }
  visit(parseDocument(html));
  return result;
}

export async function checkLinks(root, docsUrl, files) {
  const documents = new Map();
  for (const name of Object.keys(files).filter(name => name.endsWith('.html'))) {
    const nodes = elements((await readWithin(root, name)).toString());
    const ids = nodes.map(node => node.attribs.id).filter(Boolean);
    if (new Set(ids).size !== ids.length) throw new Error(`Duplicate HTML identifier: ${name}`);
    documents.set(name, { nodes, ids:new Set(ids) });
  }
  let links = 0;
  const check = (value, name, asset = false) => {
    if (!value) return;
    const url = new URL(value, 'http://mds.invalid' + docsUrl + name);
    if (url.origin !== 'http://mds.invalid') {
      if (asset) throw new Error(`External runtime asset: ${name}: ${value}`);
      return;
    }
    const pathname = decodeURIComponent(url.pathname);
    if (!pathname.startsWith(docsUrl)) {
      if (asset) throw new Error(`Runtime asset outside owned documentation: ${value}`);
      return;
    }
    let target = pathname.slice(docsUrl.length);
    if (!target || target.endsWith('/')) target += 'index.html';
    safeRelative(target);
    if (!Object.hasOwn(files, target)) throw new Error(`Broken local link: ${name}: ${value}`);
    if (url.hash && documents.has(target) && !documents.get(target).ids.has(decodeURIComponent(url.hash.slice(1)))) throw new Error(`Missing heading anchor: ${name}: ${value}`);
    links++;
  };
  for (const [name, {nodes}] of documents) for (const node of nodes) {
    if (node.attribs.href) check(node.attribs.href, name, node.name === 'link' && ['stylesheet','icon','preload'].includes(node.attribs.rel));
    if (node.attribs.src) check(node.attribs.src, name, true);
    if (node.name === 'script' && !node.attribs.src) throw new Error('Inline scripts are not permitted in publication output.');
    if (Object.keys(node.attribs).some(key => /^on/i.test(key) || key === 'style')) throw new Error('Inline event handlers or styles are not permitted in publication output.');
  }
  for (const name of Object.keys(files).filter(name => name.endsWith('.css'))) {
    const css = (await readWithin(root, name)).toString();
    for (const match of css.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g)) check(match[1], name, true);
  }
  return { pages:documents.size, links };
}

export async function readBuildMetadata(config) {
  await noSymlinks(config.internal.metadataPath);
  const metadata = JSON.parse(await readFile(config.internal.metadataPath, 'utf8'));
  if (metadata.schemaVersion !== 1 || metadata.siteId !== config.site.id || metadata.docsRoot !== config.internal.docsRoot || !metadata.files || typeof metadata.files !== 'object' || Array.isArray(metadata.files)) throw new Error('Build ownership metadata does not match this site.');
  for (const [name, digest] of Object.entries(metadata.files)) {
    safeRelative(name);
    if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error('Invalid generated file digest.');
  }
  return metadata;
}

export async function check(file, options = {}) {
  const config = await loadConfig(file);
  const metadata = await readBuildMetadata(config);
  if (metadata.configDigest !== config.internal.configDigest) throw new Error('Configuration changed after the build. Rebuild before checking.');
  await verifyFiles(config.internal.docsRoot, metadata.files);
  if (JSON.stringify(brandingMetadata(await readBranding(config))) !== JSON.stringify(metadata.branding || {})) throw new Error('Branding images changed after the build.');
  const source = await readSources(config);
  const current = Object.fromEntries([...source.entries].map(([name, item]) => [name,item.sha256]));
  if (JSON.stringify(Object.entries(current).sort()) !== JSON.stringify(Object.entries(metadata.source.files).sort())) throw new Error('Documentation sources changed after the build.');
  if (source.revision !== metadata.source.revision || source.verified !== metadata.source.verified) throw new Error('Source identity changed after the build.');
  if (options.release && (!source.verified || config.site.channel === 'preview')) throw new Error('Release checks require verified sources and a non-preview channel.');
  const result = await checkLinks(config.internal.docsRoot, config.urls.docs, metadata.files);
  return { ...result, files:Object.keys(metadata.files).length, version:config.site.version, revision:source.revision, release:!!options.release, output:config.internal.docsRoot, sourceVerified:source.verified };
}
