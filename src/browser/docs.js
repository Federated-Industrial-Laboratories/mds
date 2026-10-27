// SPDX-License-Identifier: Apache-2.0
// Enable accessible document controls, reader preferences and lazy local search.
(() => {
  'use strict';
  const moduleUrl = new URL('docs-search.js', document.currentScript.src).href;
  const byId = id => document.getElementById(id);
  const openButton = byId('search-open');
  const dialog = byId('search-dialog');
  const input = byId('search-input');
  const retry = byId('search-retry');
  const status = byId('search-status');
  const menu = byId('navigation-menu');
  let searchModule;
  let reloadRequired = false;
  const load = async () => {
    let moduleReady = false;
    retry.hidden = true;
    try {
      searchModule ||= import(moduleUrl);
      const search = await searchModule;
      moduleReady = true;
      await search.startSearch();
    } catch {
      searchModule = undefined;
      reloadRequired = !moduleReady;
      retry.textContent = reloadRequired ? 'Reload page' : 'Try again';
      status.textContent = reloadRequired
        ? 'Search could not start. Reload this page, or use the document menu.'
        : 'Search could not load. Try again, or use the document menu.';
      retry.hidden = false;
    }
  };
  const connectDialog = (target, trigger, close, initial, onOpen = () => {}) => {
    let returnFocus;
    const open = () => {
      if (target.open) return;
      if (document.querySelector('dialog[open]')) return;
      returnFocus = document.activeElement;
      target.showModal();
      initial.focus();
      onOpen();
    };
    trigger.hidden = false;
    trigger.addEventListener('click', open);
    close.addEventListener('click', () => target.close());
    target.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !event.isComposing) {
        event.preventDefault();
        target.close();
      }
    }, true);
    target.addEventListener('close', () => (returnFocus?.isConnected ? returnFocus : trigger).focus());
    target.addEventListener('click', event => {
      if (event.target !== target) return;
      const bounds = target.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) target.close();
    });
    return open;
  };
  if (typeof dialog.showModal === 'function') {
    const open = connectDialog(dialog, openButton, byId('search-close'), input, load);
    openButton.querySelector('kbd').textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? 'Command K' : 'Ctrl K';
    retry.addEventListener('click', () => reloadRequired ? location.reload() : load());
    document.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        open();
      }
    });
  }
  const preferences = window.MDSPreferences;
  const appearance = byId('appearance-dialog');
  if (preferences && typeof appearance.showModal === 'function') {
    const appearanceStatus = byId('appearance-status');
    const fields = [...appearance.querySelectorAll('select[name]')];
    const refresh = () => {
      const current = preferences.get();
      for (const field of fields) field.value = current[field.name];
    };
    const changed = (result, message = 'Appearance updated.') => {
      refresh();
      appearanceStatus.textContent = result.stored ? message : `${message} Storage is unavailable; these settings apply to this page.`;
    };
    connectDialog(appearance, byId('appearance-open'), byId('appearance-close'), fields[0], refresh);
    for (const field of fields) field.addEventListener('change', () => changed(preferences.update({ [field.name]: field.value })));
    byId('appearance-reset').addEventListener('click', () => changed(preferences.reset(), 'Site defaults restored.'));
    window.addEventListener('mds:preferences', refresh);
    refresh();
  }
  const narrow = matchMedia('(max-width: 900px)');
  const setMenu = () => { menu.open = !narrow.matches; };
  setMenu();
  narrow.addEventListener('change', setMenu);
  for (const panel of document.querySelectorAll('.code-panel')) {
    const code = panel.querySelector('pre code');
    const caption = panel.querySelector('.code-caption');
    if (!code || !caption) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-code';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', 'Copy code');
    button.setAttribute('aria-live', 'polite');
    caption.append(button);
    button.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(code.textContent); button.textContent = 'Copied'; }
      catch {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(code);
        selection.removeAllRanges();
        selection.addRange(range);
        button.textContent = 'Selected';
        button.setAttribute('aria-label', 'Code selected. Use your copy shortcut.');
      }
      setTimeout(() => { button.textContent = 'Copy'; button.setAttribute('aria-label', 'Copy code'); }, 2500);
    });
  }
  for (const pre of document.querySelectorAll('.markdown-body pre')) {
    pre.tabIndex = 0;
    pre.setAttribute('role', 'region');
    pre.setAttribute('aria-label', 'Code example');
  }
  const headings = [...document.querySelectorAll('.markdown-body h2,.markdown-body h3')];
  const toc = [...document.querySelectorAll('.docs-contents ol a')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const first = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!first) return;
      for (const link of toc) {
        if (decodeURIComponent(link.hash.slice(1)) === first.target.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    }, { rootMargin: '-10% 0px -65% 0px' });
    headings.forEach(heading => observer.observe(heading));
  }
})();
