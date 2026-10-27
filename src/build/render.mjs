// SPDX-License-Identifier: Apache-2.0
// Render safe Markdown while preserving release links, heading identifiers and code text.
import MarkdownIt from 'markdown-it';
import GithubSlugger from 'github-slugger';
import sanitizeHtml from 'sanitize-html';
import { posix } from 'node:path';
import { escapeHtml as h } from './common.mjs';
import { safeRelative } from './files.mjs';

const textOf = token => (token.children || []).map(child => ['text','code_inline','image'].includes(child.type) ? child.content : ['softbreak','hardbreak'].includes(child.type) ? ' ' : '').join('');
export function renderDocument(source, page, routeMap, options = {}) {
  const md = new MarkdownIt({ html: options.html === true, linkify: false, typographer: false });
  const headings = [], sections = [], slugger = new GithubSlugger();
  let section;
  const append = text => { section ||= { heading:page.label, url:page.url, text:'' }; section.text += `${text}\n`; };
  const moveLink = (url, image = false) => {
    if (!url || /[\x00-\x20\\]/.test(url) || url.startsWith('//')) throw new Error(`Unsafe document URL: ${page.source}: ${url}`);
    if (/^(https?:|mailto:)/i.test(url)) {
      if (image) throw new Error('Images must use declared local assets.');
      const parsed = new URL(url);
      if (parsed.username || parsed.password) throw new Error('Credentials are not permitted in document URLs.');
      return url;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(url)) throw new Error(`Unsupported document URL: ${url}`);
    if (url.startsWith('#')) return url;
    if (url.startsWith('/')) return url;
    const split = /^([^?#]*)([?#].*)?$/.exec(url);
    const path = decodeURIComponent(split[1]);
    const name = posix.normalize(posix.join(posix.dirname(page.source), path));
    safeRelative(name);
    if (!routeMap.has(name)) throw new Error(`Unknown document link: ${page.source}: ${url}`);
    return routeMap.get(name) + (split[2] || '');
  };
  let input = source;
  if (options.stripRepositoryChrome) {
    input = input.replace(/<p align="center">[\s\S]*?<\/p>/g, block => /<img\b/.test(block) ? '' : block.replace(/<\/?p[^>]*>/g, ''));
    input = input.replace(/<details>\s*<summary>On this page<\/summary>[\s\S]*?<\/details>/g, '');
    input = input.replace(/^(?:\[[^\]]+\]\([^\n)]+\)\s*\|\s*)+\[[^\]]+\]\([^\n)]+\)\s*$/gm, '');
  }
  if (page.format === 'text' || ['LICENSE','NOTICE'].includes(page.source)) {
    const fence = '`'.repeat(Math.max(3, ...[...source.matchAll(/`+/g)].map(match => match[0].length + 1)));
    input = `# ${page.label}\n\n${fence}text\n${source}${source.endsWith('\n') ? '' : '\n'}${fence}\n`;
  }
  if (!/^# /m.test(input)) input = `# ${page.label}\n\n${input}`;
  const tokens = md.parse(input, {});
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const alignment = token.attrGet('style');
    if (alignment) {
      token.attrSet('class', `align-${alignment.split(':')[1]}`);
      token.attrs = token.attrs.filter(([name]) => name !== 'style');
    }
    if (token.type === 'heading_open') {
      const title = textOf(tokens[i + 1]), id = slugger.slug(title);
      token.attrSet('id', id);
      headings.push({title, id, level:Number(token.tag.slice(1))});
      if (section?.text.trim()) sections.push(section);
      section = { heading:title, url:`${page.url}#${id}`, text:'' };
      tokens[i + 1].children.push(Object.assign(new token.constructor('html_inline','',0), { content:`<a class="heading-link" href="#${h(id)}" aria-label="Link to ${h(title)}">#</a>` }));
    }
    if (token.type === 'inline' && tokens[i - 1]?.type !== 'heading_open') append(textOf(token));
    if (['fence','code_block'].includes(token.type)) append(token.content);
  }
  if (section?.text.trim()) sections.push(section);
  md.renderer.rules.table_open = () => '<div class="table-scroll" tabindex="0" role="region" aria-label="Reference table"><table>\n';
  md.renderer.rules.table_close = () => '</table></div>\n';
  const fence = md.renderer.rules.fence;
  md.renderer.rules.fence = (items, index, settings, env, renderer) => `<div class="code-panel"><div class="code-caption"><span>${h(items[index].info.trim().split(/\s/)[0] || 'text')}</span></div>${fence(items,index,settings,env,renderer)}</div>`;
  const headingIds = new Set(headings.map(item => item.id));
  const html = sanitizeHtml(md.renderer.render(tokens, md.options, {}).replace(/<pre>/g, '<pre tabindex="0" role="region" aria-label="Code example">'), {
    allowedTags: ['p','br','hr','h1','h2','h3','h4','h5','h6','a','img','strong','em','b','i','s','del','ul','ol','li','blockquote','pre','code','table','thead','tbody','tr','th','td','details','summary','kbd','sub','sup','span','div','mark'],
    allowedAttributes: { a:['href','class','aria-label'], img:['src','alt','width','height'], '*':['class'], h1:['id'],h2:['id'],h3:['id'],h4:['id'],h5:['id'],h6:['id'], div:['class','tabindex','role','aria-label'], pre:['tabindex','role','aria-label'], ol:['start'], th:['scope','colspan','rowspan','class'], td:['colspan','rowspan','class'], details:['open'] },
    allowedClasses: { '*':['align-left','align-right','align-center'], a:['heading-link'], div:['table-scroll','code-panel','code-caption'], code:[/^language-[a-z0-9_-]+$/i] },
    allowedSchemes:['http','https','mailto'], allowProtocolRelative:false,
    transformTags: {
      a:(tagName, attributes) => ({tagName, attribs:{...attributes, ...(attributes.href ? {href:moveLink(attributes.href)} : {})}}),
      img:(tagName, attributes) => ({tagName, attribs:{...attributes, ...(attributes.src ? {src:moveLink(attributes.src,true)} : {})}}),
      '*':(tagName, attributes) => {
        if (attributes.id && (!/^h[1-6]$/.test(tagName) || !headingIds.has(attributes.id))) delete attributes.id;
        return {tagName, attribs:attributes};
      }
    }
  });
  return { html, headings, sections, title:headings.find(item => item.level === 1)?.title || page.label };
}
