// SPDX-License-Identifier: Apache-2.0
// Load the same-origin index and present keyboard-accessible document search results.
import MiniSearch from '../search/minisearch.js';
import { searchOptions, runSearch, tokenize } from '../search/common.js';

const input = document.getElementById('search-input');
const status = document.getElementById('search-status');
const list = document.getElementById('search-results');
const retry = document.getElementById('search-retry');
let engine;
let loading;
let timer;

function excerpt(text, query) {
  const lower = text.toLowerCase();
  const exact = lower.indexOf(query.toLowerCase());
  const positions = tokenize(query).filter(term => term.length > 2).sort((a, b) => b.length - a.length).map(term => lower.indexOf(term)).filter(index => index >= 0);
  const position = exact >= 0 ? exact : (positions[0] || 0);
  const start = Math.max(0, position - 65);
  return `${start ? '...' : ''}${text.slice(start, start + 230)}${text.length > start + 230 ? '...' : ''}`;
}

function highlight(node, text, query) {
  const terms = tokenize(query).filter(term => term.length >= 2).sort((a, b) => b.length - a.length);
  if (!terms.length) { node.textContent = text; return; }
  const pattern = new RegExp(terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    node.append(document.createTextNode(text.slice(offset, match.index)));
    const mark = document.createElement('mark');
    mark.textContent = match[0];
    node.append(mark);
    offset = match.index + match[0].length;
  }
  node.append(document.createTextNode(text.slice(offset)));
}

function draw() {
  if (!engine) return;
  // Loading the index can render before the input debounce expires.
  clearTimeout(timer);
  timer = undefined;
  const query = input.value.trim();
  list.replaceChildren();
  if (!query) { status.textContent = 'Search by command, setting or topic.'; return; }
  const results = runSearch(engine, query);
  status.textContent = results.length ? `${results.length === 30 ? 'First ' : ''}${results.length} matching section${results.length === 1 ? '' : 's'}.` : 'No matching sections. Try a shorter term or use the document menu.';
  for (const result of results) {
    const url = new URL(result.url, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith(document.documentElement.dataset.mdsDocsUrl)) continue;
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = url.href;
    const context = document.createElement('small');
    context.textContent = `${result.group} / ${result.title}`;
    const title = document.createElement('strong');
    highlight(title, result.heading, query);
    const description = document.createElement('p');
    highlight(description, excerpt(result.text, query), query);
    link.append(context, title, description);
    item.append(link);
    list.append(item);
  }
}

input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(draw, 100); });
input.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown') { event.preventDefault(); list.querySelector('a')?.focus(); }
  if (event.key === 'Enter') { event.preventDefault(); list.querySelector('a')?.click(); }
});
list.addEventListener('keydown', event => {
  if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
  event.preventDefault();
  const links = [...list.querySelectorAll('a')];
  const index = links.indexOf(document.activeElement);
  const next = index + (event.key === 'ArrowDown' ? 1 : -1);
  if (next < 0) input.focus();
  else links[Math.min(next, links.length - 1)]?.focus();
});

export async function startSearch() {
  retry.hidden = true;
  if (engine) { draw(); return; }
  status.textContent = 'Loading search...';
  loading ||= (async () => {
    const response = await fetch(new URL('../search/index.json', import.meta.url));
    if (!response.ok) throw new Error('Search index request failed.');
    engine = await MiniSearch.loadJSONAsync(await response.text(), searchOptions);
  })();
  try { await loading; draw(); }
  catch (error) { loading = undefined; throw error; }
}
