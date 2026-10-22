/**
 * Teekhi Bella — Luxury Static Header Controller
 * Keeps the Teekhi Bella brand logo statically centered in the navigation header at all times.
 */
(function() {
  'use strict';

  function initHeader() {
    const header = document.querySelector('.luxury-header');
    const logo = document.getElementById('BrandMorphLogo') || document.querySelector('.brand-morph-logo');

    if (header) {
      header.classList.add('scrolled-down');
    }
    if (logo) {
      logo.classList.remove('jump-in', 'animate-entrance', 'merge-up');
      logo.classList.add('is-visible');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeader);
  } else {
    initHeader();
  }
})();
