// SPDX-License-Identifier: Apache-2.0
// Share identifier-aware search behaviour between the build and browser.
export const escapeHtml = text => String(text).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
export function tokenize(text, fieldName) {
  const terms = String(text).toLowerCase().match(/[\p{L}\p{N}_./-]+/gu) || [];
  if (!fieldName) return terms;
  return terms.flatMap(term => [...new Set([term, ...term.split('/').filter(Boolean), ...term.split(/[_./-]+/).filter(Boolean)])]);
}
export const searchOptions = { fields:['title','heading','text'], storeFields:['title','heading','url','text','group'], tokenize };
export function runSearch(engine, query) {
  const input = String(query).trim().slice(0, 160);
  if (!input) return [];
  const options = { boost:{title:5, heading:4}, combineWith:'AND' };
  let results = engine.search(input, options);
  if (results.length < 8) {
    const used = new Set(results.map(result => result.id));
    results.push(...engine.search(input, { ...options, prefix:term => term.length >= 3 }).filter(result => !used.has(result.id)));
  }
  if (!results.length && /^[\p{L}\s]+$/u.test(input)) results = engine.search(input, { ...options, fuzzy:term => term.length >= 8 ? 2 : term.length >= 5 ? 1 : false });
  return results.slice(0, 30);
}
