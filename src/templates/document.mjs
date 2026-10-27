// SPDX-License-Identifier: Apache-2.0
// Compose the shared documentation shell and accessible reader controls.
import { catalog, enabledThemes } from '../../themes/index.mjs';
import { defaultLabels } from '../labels.mjs';

const h = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));
const option = (value, label, current) => `<option value="${h(value)}"${value === current ? ' selected' : ''}>${h(label)}</option>`;

export function template(page, document, pages, config) {
  const { site, urls, appearance } = config;
  const labels = { ...defaultLabels, ...config.labels };
  const t = name => h(labels[name]);
  const themes = enabledThemes(appearance);
  const groups = [...new Set(pages.map(item => item.group))];
  const navigation = groups.map(group => `<details class="nav-group"${group === page.group ? ' open' : ''}>
    <summary>${h(group)}</summary><ul>${pages.filter(item => item.group === group).map(item =>
    `<li><a href="${h(item.url)}"${item.url === page.url ? ' aria-current="page"' : ''}>${h(item.label)}</a></li>`).join('')}</ul></details>`).join('');
  const contents = document.headings.filter(item => [2, 3].includes(item.level)).map(item =>
    `<li class="toc-level-${item.level}"><a href="#${h(item.id)}">${h(item.title)}</a></li>`).join('');
  const position = pages.findIndex(item => item.url === page.url);
  const neighbor = (item, key) => item ? `<a href="${h(item.url)}"><small>${t(key)}</small><span>${h(item.label)} <b aria-hidden="true">${key === 'previous' ? '&#8592;' : '&#8594;'}</b></span></a>` : '<span></span>';
  const release = [site.channel, site.version ? `Version ${site.version}` : ''].filter(Boolean).join(' / ');
  const editUrl = site.editBaseUrl ? `${site.editBaseUrl.replace(/\/?$/, '/')}${page.source.split('/').map(encodeURIComponent).join('/')}` : '';
  const sourceLinks = `${site.repositoryUrl ? `<a href="${h(site.repositoryUrl)}">${t('sourceRepository')}</a>` : ''}${editUrl ? `<a href="${h(editUrl)}">${t('editPage')}</a>` : ''}`;
  const defaults = Object.fromEntries(['palette', 'mode', 'finish', 'typography', 'contrast'].map(key => [key, appearance[key]]));
  const appearanceAttributes = Object.entries(defaults).map(([key, value]) => `data-mds-${key}="${h(value)}"`).join(' ');
  const canonical = site.origin ? new URL(page.url, site.origin).href : '';
  const logos = config.brandingUrls || {};
  const mark = logos.logo ? `<span class="brand-logo${logos.darkLogo ? ' has-dark-logo' : ''}" aria-hidden="true"><img class="brand-logo-light" src="${h(logos.logo)}" alt="" width="64" height="64">${logos.darkLogo ? `<img class="brand-logo-dark" src="${h(logos.darkLogo)}" alt="" width="64" height="64">` : ''}</span>` : '<span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>';
  return `<!doctype html>
<html lang="${h(site.language || 'en')}" data-mds-site="${h(site.id)}" data-mds-themes="${h(themes.join(','))}" data-mds-defaults="${h(JSON.stringify(defaults))}" data-mds-docs-url="${h(urls.docs)}" ${appearanceAttributes}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${h(document.title)}. ${h(site.description || `${site.title} documentation`)}">
  ${site.indexable ? '' : '<meta name="robots" content="noindex, nofollow">'}
  <title>${h(document.title)} | ${h(site.title)} documentation</title>
  <link rel="icon" href="${h(logos.logo || urls.assets + 'favicon.svg')}">
  ${canonical ? `<link rel="canonical" href="${h(canonical)}">` : ''}
  <script src="${h(urls.assets)}preferences.js"></script>
  <link rel="stylesheet" href="${h(urls.assets)}themes.css">
  <link rel="stylesheet" href="${h(urls.assets)}docs.css">
  <script src="${h(urls.assets)}docs.js" defer></script>
</head>
<body class="docs-page">
<a class="skip-link" href="#article">${t('skipToContent')}</a>
<div class="docs-shell">
  <div class="shell-rail" aria-hidden="true"><span></span><i></i><i></i><i></i></div>
  <header class="docs-masthead">
    <a class="docs-brand" href="${h(urls.docs)}" aria-label="${h(site.title)} ${t('documentationHome')}">${mark}<span>${h(site.title)}<small>${t('documentation')}</small></span></a>
    <div class="masthead-tools">${release ? `<span class="release-label">${h(release)}</span>` : ''}${site.homeUrl ? `<a href="${h(site.homeUrl)}">${t('projectWebsite')} <span aria-hidden="true">&#8599;</span></a>` : ''}</div>
  </header>
  <div class="docs-toolbar">
    <span class="toolbar-label">${t('referenceLibrary')}</span>
    <div class="toolbar-controls">
      <button class="search-trigger" id="search-open" type="button" hidden><span>${t('search')}</span><kbd>Ctrl K</kbd></button>
      <button id="appearance-open" type="button" hidden>${t('appearance')}</button>
    </div>
  </div>
  <noscript><p class="script-note">Browse with the document menu and page contents. Search and appearance controls require JavaScript. The site's appearance and supported system preferences still apply.</p></noscript>
  <div class="docs-grid">
    <nav class="docs-navigation" aria-label="${t('documentation')}"><details id="navigation-menu" open><summary class="panel-title">${t('documentMenu')} <span aria-hidden="true">&#9776;</span></summary><div class="navigation-body">${navigation}</div></details><div class="navigation-foot"><span>${h(site.title)}</span><span>${h(site.version)}</span></div></nav>
    <main class="document-window" id="article" tabindex="-1">
      <div class="window-title"><span>${h(page.group)}</span><span class="frame-slots" aria-hidden="true">&#9648; &#9648; &#9648;</span></div>
      <div class="article-surface">
        <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${h(urls.docs)}">${t('documentation')}</a><span aria-hidden="true">/</span><span>${h(page.label)}</span></nav>
        ${release ? `<div class="article-meta"><span>${h(release)}</span><span>Manual</span></div>` : ''}
        ${contents ? `<details class="inline-contents"><summary>${t('pageContents')}</summary><ol>${contents}</ol></details>` : ''}
        <article class="markdown-body">${document.html}</article>
        <nav class="document-neighbors" aria-label="Adjacent documents">${neighbor(pages[position - 1], 'previous')}${neighbor(pages[position + 1], 'next')}</nav>
      </div>
      <div class="window-bottom"><span>${h(site.title)} / ${t('documentation')}</span><a href="#article">${t('backToTop')} <span aria-hidden="true">&#8593;</span></a></div>
    </main>
    <aside class="docs-contents" aria-label="${t('pageContents')}">${contents ? `<div class="panel-title">${t('pageContents')}</div><ol>${contents}</ol>` : ''}${sourceLinks ? `<div class="contents-note">${sourceLinks}</div>` : ''}</aside>
  </div>
  <footer class="docs-footer"><span>${h(site.footer || site.title)}</span><nav aria-label="Project links">${sourceLinks}<a href="${h(urls.docs)}">${t('documentationHome')}</a></nav></footer>
  <div class="shell-rail bottom-rail" aria-hidden="true"></div>
</div>
<dialog id="search-dialog" aria-labelledby="search-title">
  <div class="window-title"><h2 id="search-title">${t('search')}</h2><button id="search-close" type="button" aria-label="Close search">&#215;</button></div>
  <div class="search-field"><label for="search-input">Search the manuals</label><input id="search-input" type="search" autocomplete="off" spellcheck="false" maxlength="160" placeholder="Commands, settings, concepts..."><span>Press Escape to close</span></div>
  <p id="search-status" role="status" aria-live="polite">Loading search...</p>
  <button id="search-retry" type="button" hidden>Try again</button>
  <ol id="search-results" aria-label="Search results"></ol>
  <div class="search-footer"><span>${h(site.title)}</span><span>Search runs in your browser</span></div>
</dialog>
<dialog id="appearance-dialog" aria-labelledby="appearance-title" aria-describedby="appearance-description">
  <div class="window-title"><h2 id="appearance-title">Reading appearance</h2><button id="appearance-close" type="button" aria-label="Close appearance">&#215;</button></div>
  <div class="appearance-body">
    <p id="appearance-description">Choose colours, surfaces and text independently. These settings are saved for this documentation site in this browser.</p>
    <div class="appearance-fields">
      <label for="appearance-palette">Palette<select id="appearance-palette" name="palette">${themes.map(id => option(id, catalog[id].label, appearance.palette)).join('')}</select></label>
      <label for="appearance-mode">Colour mode<select id="appearance-mode" name="mode">${[['system', 'Use system setting'], ['light', 'Light'], ['dark', 'Dark']].map(([value, label]) => option(value, label, appearance.mode)).join('')}</select></label>
      <label for="appearance-finish">Surface finish<select id="appearance-finish" name="finish">${[['metalheart', 'Metalheart'], ['flat', 'Flat']].map(([value, label]) => option(value, label, appearance.finish)).join('')}</select></label>
      <label for="appearance-typography">Typography<select id="appearance-typography" name="typography">${[['standard', 'Standard'], ['display', 'Display headings']].map(([value, label]) => option(value, label, appearance.typography)).join('')}</select></label>
      <label for="appearance-contrast">Contrast<select id="appearance-contrast" name="contrast">${[['system', 'Use system setting'], ['normal', 'Use selected palette'], ['more', 'Increased contrast']].map(([value, label]) => option(value, label, appearance.contrast)).join('')}</select></label>
    </div>
    <p class="appearance-help">Flat surfaces remove decorative materials. Typography is a separate choice. Increased contrast uses the Contrast palette. System forced colours always take precedence.</p>
    <div class="appearance-actions"><button id="appearance-reset" type="button">Reset to site defaults</button></div>
    <p id="appearance-status" role="status" aria-live="polite"></p>
  </div>
</dialog>
</body>
</html>\n`;
}
