/**
 * Teekhi Bella — Luxury Static Header & Mobile Drawer Controller
 * Keeps the brand logo statically centered and manages the mobile navigation menu.
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

    initMobileDrawer();
  }

  function initMobileDrawer() {
    const menuToggle = document.querySelector('.menu-toggle');
    const drawer = document.getElementById('LuxuryMobileMenu') || document.querySelector('.luxury-mobile-drawer');
    const closeBtn = document.getElementById('MobileMenuClose') || (drawer ? drawer.querySelector('.luxury-mobile-drawer__close') : null);
    const backdrop = document.getElementById('MobileMenuBackdrop') || (drawer ? drawer.querySelector('.luxury-mobile-drawer__backdrop') : null);
    const navLinks = drawer ? drawer.querySelectorAll('.mobile-nav-link') : [];

    if (!menuToggle || !drawer) return;

    function openMenu() {
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      menuToggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('mobile-nav-open');
    }

    function closeMenu() {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      menuToggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('mobile-nav-open');
    }

    menuToggle.addEventListener('click', function(e) {
      e.preventDefault();
      if (drawer.classList.contains('is-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        closeMenu();
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', function() {
        closeMenu();
      });
    }

    navLinks.forEach(function(link) {
      link.addEventListener('click', function() {
        closeMenu();
      });
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        closeMenu();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeader);
  } else {
    initHeader();
  }
})();
