// SPDX-License-Identifier: Apache-2.0
// Validate data-only palettes and emit selected themes with system fallbacks.
import Ajv from 'ajv';
import data from './catalog.json' with { type: 'json' };
import schema from '../schemas/theme.schema.json' with { type: 'json' };

const validate = new Ajv({allErrors:true,strict:true}).compile(schema);
if (!validate(data)) throw new Error('Invalid bundled MDS theme catalogue.');
export const schemaVersion = data.schemaVersion;
export const catalog = Object.freeze(Object.fromEntries(Object.entries(data.palettes).map(([id, theme]) =>
  [id, Object.freeze({...theme, light:Object.freeze(theme.light), dark:Object.freeze(theme.dark)})])));

export function enabledThemes(appearance = {}) {
  const ids = [...new Set(['neutral', 'contrast', ...(appearance.themes || [])])];
  for (const id of ids) if (!Object.hasOwn(catalog, id)) throw new Error(`Unknown theme: ${id}`);
  if (appearance.palette && !ids.includes(appearance.palette)) throw new Error('The default palette must be enabled.');
  return ids;
}

const declarations = (tokens, mode) => `color-scheme:${mode};${Object.entries(tokens).map(([key, value]) => `--mds-${key}:${value}`).join(';')}`;
const rule = (selector, tokens, mode) => `${selector}{${declarations(tokens, mode)}}`;

export function themeCss(appearance = {}) {
  const ids = enabledThemes(appearance);
  const lines = ['/* SPDX-License-Identifier: Apache-2.0 */', '/* Selected palettes and browser preference fallbacks. */'];
  lines.push(rule(':root', catalog.neutral.light, 'light'));
  for (const id of ids) {
    const selector = `:root[data-mds-palette="${id}"]`;
    lines.push(rule(selector, catalog[id].light, 'light'));
    lines.push(rule(`${selector}[data-mds-mode="dark"]`, catalog[id].dark, 'dark'));
    lines.push(`@media(prefers-color-scheme:dark){${rule(`${selector}[data-mds-mode="system"]`, catalog[id].dark, 'dark')}}`);
  }
  const contrast = selector => [
    rule(selector, catalog.contrast.light, 'light'),
    rule(`${selector}[data-mds-mode="dark"]`, catalog.contrast.dark, 'dark'),
    `@media(prefers-color-scheme:dark){${rule(`${selector}[data-mds-mode="system"]`, catalog.contrast.dark, 'dark')}}`,
  ].join('\n');
  // Repeating :root ensures contrast rules override any selected palette in every mode.
  lines.push(contrast(':root:root[data-mds-contrast="more"]'));
  const system = ':root:root[data-mds-contrast="system"]';
  lines.push(`@media(prefers-contrast:more){${rule(system,catalog.contrast.light,'light')}${rule(`${system}[data-mds-mode="dark"]`,catalog.contrast.dark,'dark')}}`);
  lines.push(`@media(prefers-contrast:more) and (prefers-color-scheme:dark){${rule(`${system}[data-mds-mode="system"]`,catalog.contrast.dark,'dark')}}`);
  return `${lines.join('\n')}\n`;
}
