/**
 * TEEKHI BELLA — HAUTE COUTURE RUNWAY PRELOADER ENGINE
 * Coordinates high-speed flashing sequence of 5 bespoke looks until the site loads.
 * Supports Theme Settings for session gating, frame speed, and minimum duration.
 */

(function () {
  'use strict';

  class AtelierPreloader {
    constructor() {
      this.el = document.getElementById('AtelierPreloader');
      if (!this.el) return;

      // Check URL bypass for fast development/admin
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('nopreload') === 'true') {
        this.el.style.display = 'none';
        return;
      }

      // Check 'Play Once Per Session' Theme Setting
      const oncePerSession = this.el.dataset.oncePerSession === 'true';
      if (oncePerSession && !(window.Shopify && window.Shopify.designMode)) {
        try {
          if (sessionStorage.getItem('tb_preloader_shown') === '1') {
            this.el.classList.add('is-loaded');
            this.el.style.display = 'none';
            return;
          }
        } catch (_) {}
      }

      this.outfits = [
        { id: 1, name: 'Archival Manuscript Corset Gown', tag: 'LOOK 01' },
        { id: 2, name: 'Heritage Mural Mirror Lehenga', tag: 'LOOK 02' },
        { id: 3, name: 'Rose-Coral Shimmer Saree Gown', tag: 'LOOK 03' },
        { id: 4, name: 'Midnight Botanical Co-ord Set', tag: 'LOOK 04' },
        { id: 5, name: 'Bordeaux Peplum Halter Gown', tag: 'LOOK 05' }
      ];

      this.currentIndex = 0;
      this.items = this.el.querySelectorAll('.preloader-look-item');
      this.counterEl = this.el.querySelector('.preloader-look-counter');
      this.nameEl = this.el.querySelector('.preloader-look-name');
      this.progressFill = this.el.querySelector('.preloader-progress-fill');
      this.flashGlow = this.el.querySelector('.preloader-look-flash');

      const parsedMin = parseInt(this.el.dataset.minDuration, 10);
      const parsedFrame = parseInt(this.el.dataset.frameDuration, 10);

      this.startTime = Date.now();
      this.minDisplayTime = !isNaN(parsedMin) && parsedMin >= 300 ? parsedMin : 2000;
      this.maxSafetyTimeout = Math.max(this.minDisplayTime + 1500, 4000);
      this.frameDuration = !isNaN(parsedFrame) && parsedFrame >= 50 ? parsedFrame : 190;

      this.isPageLoaded = (document.readyState === 'complete');
      this.isDismissed = false;
      this.timer = null;

      this.init();
    }

    init() {
      // Show first look immediately
      this.showOutfit(0);

      // Start flashing strobe loop
      this.timer = setInterval(() => {
        this.nextOutfit();
      }, this.frameDuration);

      // Listen for window load
      if (!this.isPageLoaded) {
        window.addEventListener('load', () => {
          this.isPageLoaded = true;
          this.checkExitCondition();
        });
        document.addEventListener('DOMContentLoaded', () => {
          // Progress bump on DOM ready
          this.updateProgress(65);
        });
      } else {
        this.checkExitCondition();
      }

      // Safety timeout guarantee
      setTimeout(() => {
        this.dismiss();
      }, this.maxSafetyTimeout);
    }

    showOutfit(index) {
      if (!this.items.length) return;

      this.items.forEach((item, i) => {
        if (i === index) {
          item.classList.add('is-active');
        } else {
          item.classList.remove('is-active');
        }
      });

      const activeData = this.outfits[index] || this.outfits[0];

      if (this.counterEl) {
        this.counterEl.textContent = `${activeData.tag} / 05`;
      }

      if (this.nameEl) {
        this.nameEl.textContent = activeData.name;
      }

      // Trigger subtle lens strobe glow
      if (this.flashGlow) {
        this.flashGlow.classList.add('is-flashing');
        setTimeout(() => {
          this.flashGlow.classList.remove('is-flashing');
        }, 80);
      }
    }

    nextOutfit() {
      if (this.isDismissed) return;

      this.currentIndex = (this.currentIndex + 1) % (this.items.length || this.outfits.length);
      this.showOutfit(this.currentIndex);

      // Smooth progress update over time
      const elapsed = Date.now() - this.startTime;
      const progressPercent = Math.min(95, Math.round((elapsed / this.minDisplayTime) * 100));
      this.updateProgress(progressPercent);

      this.checkExitCondition();
    }

    updateProgress(percent) {
      if (this.progressFill) {
        this.progressFill.style.width = `${percent}%`;
      }
    }

    checkExitCondition() {
      if (this.isDismissed) return;

      const elapsed = Date.now() - this.startTime;
      if (this.isPageLoaded && elapsed >= this.minDisplayTime) {
        this.dismiss();
      }
    }

    dismiss() {
      if (this.isDismissed) return;
      this.isDismissed = true;

      clearInterval(this.timer);
      this.updateProgress(100);

      try {
        sessionStorage.setItem('tb_preloader_shown', '1');
      } catch (_) {}

      // Add loaded class for silky smooth exit transition
      this.el.classList.add('is-loaded');

      // Dispatch custom event for theme sections
      window.dispatchEvent(new CustomEvent('atelier:preloader:dismissed', {
        detail: { elapsed: Date.now() - this.startTime }
      }));

      // Remove from document flow after transition completes
      setTimeout(() => {
        this.el.style.display = 'none';
      }, 700);
    }
  }

  // Self-initialize immediately on script evaluation
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.atelierPreloaderInstance = new AtelierPreloader();
    });
  } else {
    window.atelierPreloaderInstance = new AtelierPreloader();
  }
})();
