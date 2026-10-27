// SPDX-License-Identifier: Apache-2.0
// Read local project marks without recolouring them or introducing remote assets.
import {extname, resolve} from 'node:path';
import {parseDocument} from 'htmlparser2';
import {contains, readWithin, safeRelative, hash} from './files.mjs';

const svgTags = new Set('svg title desc defs g path rect circle ellipse line polyline polygon text tspan linearGradient radialGradient stop clipPath mask pattern use'.split(' '));
function validateSvg(bytes) {
  const text = bytes.toString('utf8');
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('Logo SVG must not contain document types or entities.');
  const document = parseDocument(text,{xmlMode:true,decodeEntities:true});
  const roots = document.children.filter(node => node.type === 'tag');
  if (roots.length !== 1 || roots[0].name !== 'svg' || roots[0].attribs.xmlns !== 'http://www.w3.org/2000/svg') throw new Error('Logo must be an SVG image.');
  const visit = node => {
    if (node.type === 'directive') {
      if (node.name !== '?xml') throw new Error('Unsupported logo SVG processing instruction.');
      return;
    }
    if (node.name) {
      if (!svgTags.has(node.name)) throw new Error(`Unsupported logo SVG element: ${node.name}`);
      for (const [key,value] of Object.entries(node.attribs || {})) {
        if (/^on/i.test(key) || /^(?:xml:base|src)$/i.test(key)) throw new Error('Logo SVG must not contain executable or external content.');
        if (/^(?:href|xlink:href)$/i.test(key) && !/^#[A-Za-z_][\w:.-]*$/.test(value)) throw new Error('Logo SVG references must stay inside the image.');
        if (/@import|expression\s*\(|javascript:|\\/i.test(value)) throw new Error('Unsupported logo SVG attribute.');
        for (const match of value.matchAll(/url\((.*?)\)/gi)) if (!/^\s*['"]?#[A-Za-z_][\w:.-]*['"]?\s*$/.test(match[1])) throw new Error('Logo SVG references must stay inside the image.');
      }
    }
    for (const child of node.children || []) visit(child);
  };
  visit(document);
}

export async function readBranding(config) {
  const entries = {};
  for (const [key,source] of Object.entries(config.branding || {})) {
    safeRelative(source);
    if (contains(config.internal.docsRoot,resolve(config.internal.root,source))) throw new Error('Branding inputs overlap generated output.');
    const extension = extname(source).toLowerCase();
    if (!['.svg','.png','.webp'].includes(extension)) throw new Error('Branding images must use SVG, PNG or WebP.');
    const bytes = await readWithin(config.internal.root,source);
    if (bytes.length > 1024 * 1024) throw new Error('Branding images must be at most 1 MiB.');
    if (extension === '.svg') validateSvg(bytes);
    if (extension === '.png' && bytes.subarray(0,8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Invalid PNG logo.');
    if (extension === '.webp' && (bytes.subarray(0,4).toString() !== 'RIFF' || bytes.subarray(8,12).toString() !== 'WEBP')) throw new Error('Invalid WebP logo.');
    entries[key] = {source,file:`_mds/branding/${key === 'logo' ? 'logo' : 'logo-dark'}${extension}`,sha256:hash(bytes),bytes};
  }
  return entries;
}

export const brandingMetadata = entries => Object.fromEntries(Object.entries(entries).map(([key,{bytes,...entry}]) => [key,entry]));
