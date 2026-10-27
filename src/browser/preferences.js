// SPDX-License-Identifier: Apache-2.0
// Restore bounded site preferences before styles load and synchronise reader settings.
(() => {
  'use strict';
  const root = document.documentElement;
  const schemaVersion = 1;
  const key = `mds:preferences:${schemaVersion}:${encodeURIComponent(root.dataset.mdsSite || 'default')}`;
  const themes = Object.freeze((root.dataset.mdsThemes || 'neutral,contrast').split(','));
  const allowed = {
    palette: themes, mode: ['system', 'light', 'dark'], finish: ['metalheart', 'flat'],
    typography: ['standard', 'display'], contrast: ['system', 'normal', 'more'],
  };
  const fallback = { palette: 'neutral', mode: 'system', finish: 'metalheart', typography: 'standard', contrast: 'system' };
  const normalise = (value, base) => Object.fromEntries(Object.keys(allowed).map(name => [name,
    value && Object.hasOwn(value, name) && allowed[name].includes(value[name]) ? value[name] : base[name],
  ]));
  let supplied;
  try { supplied = JSON.parse(root.dataset.mdsDefaults || '{}'); } catch { supplied = {}; }
  const defaults = Object.freeze(normalise(supplied, fallback));
  const parse = value => {
    if (!value || value.length > 2048) return { ...defaults };
    try {
      const parsed = JSON.parse(value);
      return parsed?.schemaVersion === schemaVersion ? normalise(parsed.preferences, defaults) : { ...defaults };
    } catch { return { ...defaults }; }
  };
  let saved;
  try { saved = localStorage.getItem(key); } catch { saved = null; }
  let state = parse(saved);
  const apply = () => {
    for (const [name, value] of Object.entries(state)) root.dataset[`mds${name[0].toUpperCase()}${name.slice(1)}`] = value;
  };
  const announce = () => window.dispatchEvent(new CustomEvent('mds:preferences', { detail: { ...state } }));
  const persist = reset => {
    try {
      if (reset) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify({ schemaVersion, preferences: state }));
      return true;
    } catch { return false; }
  };
  const update = values => {
    state = normalise(values, state);
    apply();
    const stored = persist(false);
    announce();
    return { preferences: { ...state }, stored };
  };
  const reset = () => {
    state = { ...defaults };
    apply();
    const stored = persist(true);
    announce();
    return { preferences: { ...state }, stored };
  };
  apply();
  window.MDSPreferences = Object.freeze({ get: () => ({ ...state }), update, reset, defaults, themes, key });
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    state = parse(event.newValue);
    apply();
    announce();
  });
})();
