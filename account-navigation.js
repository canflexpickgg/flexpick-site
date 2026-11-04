/* Presentation context only. Cloudflare and Stripe remain responsible for access. */
(function () {
  'use strict';
  var workspace = new URLSearchParams(location.search).get('from') === 'workspace';
  try {
    var previous = new URL(document.referrer);
    workspace = workspace || (previous.origin === location.origin && /^\/app(?:\/|$)/.test(previous.pathname));
  } catch (_) {}
  document.documentElement.dataset.accountContext = workspace ? 'workspace' : 'public';
  document.addEventListener('DOMContentLoaded', function () {
    var link = document.querySelector('[data-login-continue]');
    if (!link) return;
    link.addEventListener('click', function (event) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.defaultPrevented) return;
      link.setAttribute('aria-busy', 'true');
      link.textContent = 'Opening your workspace…';
    });
    window.addEventListener('pageshow', function () {
      link.removeAttribute('aria-busy');
      link.textContent = 'Continue with email code';
    });
  });
})();
