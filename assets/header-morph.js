/**
 * Teekhi Bella — Luxury Static Header & Mobile Dropdown Controller
 * Keeps the brand logo statically centered and manages the mobile navigation dropdown.
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

    initMobileDropdown();
    highlightActiveNav();
    updateAnnouncementBarOffset();

    window.addEventListener('scroll', updateAnnouncementBarOffset, { passive: true });
    window.addEventListener('resize', updateAnnouncementBarOffset, { passive: true });
    document.addEventListener('shopify:section:load', updateAnnouncementBarOffset);
    document.addEventListener('shopify:section:select', updateAnnouncementBarOffset);
  }

  function updateAnnouncementBarOffset() {
    try {
      const header = document.querySelector('.luxury-header');
      const spacer = document.querySelector('.luxury-header-spacer');
      if (!header) return;

      header.style.top = '0px';
      if (spacer) {
        spacer.style.height = (header.offsetHeight || 80) + 'px';
      }
    } catch (e) {}
  }

  function highlightActiveNav() {
    try {
      const p = (window.location.pathname || '').toLowerCase();
      const h = (window.location.href || '').toLowerCase();
      const isWaitlist = p.indexOf('waitlist') !== -1 || h.indexOf('waitlist') !== -1;
      const isHome = !isWaitlist && (p === '' || p === '/' || p.endsWith('/preview.html') || p.endsWith('/index.html') || p.endsWith('.myshopify.com/'));

      if (isWaitlist) {
        document.querySelectorAll('.header-nav-waitlist, .dropdown-link-waitlist').forEach(function(el) { el.classList.add('is-active'); });
        document.querySelectorAll('.header-nav-home, .dropdown-link-home').forEach(function(el) { el.classList.remove('is-active'); });
      } else if (isHome) {
        document.querySelectorAll('.header-nav-home, .dropdown-link-home').forEach(function(el) { el.classList.add('is-active'); });
        document.querySelectorAll('.header-nav-waitlist, .dropdown-link-waitlist').forEach(function(el) { el.classList.remove('is-active'); });
      }
    } catch (e) {}
  }

  function initMobileDropdown() {
    const menuToggle = document.getElementById('HeaderMenuToggle') || document.querySelector('.menu-toggle');
    const dropdown = document.getElementById('LuxuryMenuDropdown') || document.querySelector('.luxury-menu-dropdown');
    const wrapper = document.querySelector('.menu-dropdown-wrapper');
    const navLinks = dropdown ? dropdown.querySelectorAll('.dropdown-nav-link') : [];

    if (!menuToggle || !dropdown) return;

    function openDropdown() {
      dropdown.classList.add('is-open');
      dropdown.setAttribute('aria-hidden', 'false');
      menuToggle.setAttribute('aria-expanded', 'true');
    }

    function closeDropdown() {
      dropdown.classList.remove('is-open');
      dropdown.setAttribute('aria-hidden', 'true');
      menuToggle.setAttribute('aria-expanded', 'false');
    }

    menuToggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (dropdown.classList.contains('is-open')) {
        closeDropdown();
      } else {
        openDropdown();
      }
    });

    navLinks.forEach(function(link) {
      link.addEventListener('click', function() {
        closeDropdown();
      });
    });

    // Close on click outside
    document.addEventListener('click', function(e) {
      if (dropdown.classList.contains('is-open')) {
        if (wrapper && !wrapper.contains(e.target)) {
          closeDropdown();
        } else if (!dropdown.contains(e.target) && !menuToggle.contains(e.target)) {
          closeDropdown();
        }
      }
    });

    // Close on Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && dropdown.classList.contains('is-open')) {
        closeDropdown();
        menuToggle.focus();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeader);
  } else {
    initHeader();
  }
})();
