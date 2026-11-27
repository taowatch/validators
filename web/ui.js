/*
 * UI choice (Default or Terminal), loaded synchronously in <head> before anything renders,
 * so there is no flash of the wrong UI. The page says which one it is:
 *   <script src="/ui.js?v=…" data-page="index|terminal|analytics|terminal-analytics|faq|terminal-faq">
 * ?ui=terminal|default in the URL wins and is remembered in localStorage "vy.ui".
 * A viewer who picked Terminal is sent from a default page to its Terminal twin (keeping the
 * hash route); ?ui=default on a Terminal page sends them back.
 */
(function () {
  'use strict';
  var me = document.currentScript;
  var page = me && me.getAttribute('data-page');
  var TWIN = {
    index: { ui: 'default', other: '/terminal', hash: true },
    analytics: { ui: 'default', other: '/terminal/analytics', hash: false },
    terminal: { ui: 'terminal', other: '/', hash: true },
    'terminal-analytics': { ui: 'terminal', other: '/analytics', hash: false },
    faq: { ui: 'default', other: '/terminal/faq', hash: true },
    'terminal-faq': { ui: 'terminal', other: '/faq', hash: true },
  };
  var t = TWIN[page];
  if (!t) return;
  try {
    var q = new URLSearchParams(location.search).get('ui');
    if (q === 'terminal' || q === 'default') localStorage.setItem('vy.ui', q);
    var want = q || localStorage.getItem('vy.ui');
    // default pages follow the stored choice; terminal pages only leave on an explicit ?ui=default
    var leave = t.ui === 'default' ? want === 'terminal' : q === 'default';
    if (leave) location.replace(t.other + (t.hash ? location.hash : ''));
  } catch (e) {
    /* storage blocked: stay on this page */
  }
})();
