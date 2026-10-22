/**
 * Teekhi Bella — Luxury Morphing Header Controller
 * Reverse-engineered from Sophie & Lucie header behavior.
 * 
 * Manages:
 * 1. Initial page-load entrance animation (logo drops down out of topbar)
 * 2. 60-80px scroll threshold dock/undock with cubic-bezier(0.5, 0, 0, 1) easing
 * 3. Tagline elevation and opacity toggle
 * 4. Header background blur & contrast switching
 */

(function() {
  'use strict';

  function initHeaderMorph() {
    const header = document.querySelector('.luxury-header');
    const logo = document.getElementById('BrandMorphLogo') || document.querySelector('.brand-morph-logo');
    const heroSection = document.querySelector('.hero-editorial-masthead') || document.querySelector('.hero-3d-section');

    if (!header || !logo) return;

    const THRESHOLD = window.innerWidth <= 768 ? 50 : 80;
    let isDocked = false;
    let ticking = false;

    // Check if hero exists on this page
    const hasHero = Boolean(heroSection);

    // If no hero section is present on this page (e.g. subpages / product detail),
    // immediately dock the logo into the sticky navigation bar
    if (!hasHero) {
      header.classList.add('scrolled-down');
      logo.classList.remove('jump-in');
      logo.classList.add('merge-up');
      return;
    }

    const initialY = window.pageYOffset || document.documentElement.scrollTop;

    if (initialY > THRESHOLD || window.location.search.includes('docked=true')) {
      // User reloaded or navigated when already scrolled down
      isDocked = true;
      header.classList.add('scrolled-down');
      logo.classList.remove('jump-in');
      logo.classList.add('merge-up');
    } else {
      // Fresh load at top of page: play initial entrance animation
      isDocked = false;
      logo.classList.add('jump-in', 'animate-entrance');

      setTimeout(function() {
        logo.classList.remove('animate-entrance');
      }, 1150);
    }

    function onScroll() {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;

      if (scrollY > THRESHOLD && !isDocked) {
        isDocked = true;
        logo.classList.remove('animate-entrance');
        header.classList.add('scrolled-down');
        logo.classList.remove('jump-in');
        logo.classList.add('merge-up');
      } else if (scrollY <= THRESHOLD && isDocked) {
        isDocked = false;
        header.classList.remove('scrolled-down');
        logo.classList.remove('merge-up');
        logo.classList.add('jump-in');
      }

      ticking = false;
    }

    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(onScroll);
        ticking = true;
      }
    }, { passive: true });

    // Handle resize threshold recalibration
    window.addEventListener('resize', function() {
      onScroll();
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeaderMorph);
  } else {
    initHeaderMorph();
  }
})();
