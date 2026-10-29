/**
 * Sun & Lighting Scrubber (8 Modes) - Teekhi Bella
 * Inspired by Studio Parc (@studio.parc) PDP Solar Prototype
 */

if (!customElements.get('sun-light-scrubber')) {
  class SunLightScrubber extends HTMLElement {
    constructor() {
      super();

      // 8 Discrete Lighting Modes
      this.MODES = [
        {
          index: 0,
          time: '06:00',
          name: 'Dawn',
          hour: 6,
          isDark: false,
          glowColor: 'rgba(160, 210, 255, 0.7)',
          filter: 'brightness(1.02) contrast(0.96) saturate(0.92) hue-rotate(5deg)',
          ambientBg: 'linear-gradient(170deg, rgba(175, 205, 245, 0.28) 0%, transparent 70%)',
          ambientMix: 'soft-light',
          ambientOpacity: 0.85,
          sunbeamBg: 'transparent',
          sunbeamOpacity: 0,
          spotlightBg: 'transparent',
          spotlightOpacity: 0,
          shimmerOpacity: 0
        },
        {
          index: 1,
          time: '09:00',
          name: 'Morning',
          hour: 9,
          isDark: false,
          glowColor: 'rgba(255, 245, 210, 0.7)',
          filter: 'brightness(1.0) contrast(1.0) saturate(1.0)',
          ambientBg: 'linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, transparent 60%)',
          ambientMix: 'soft-light',
          ambientOpacity: 0.4,
          sunbeamBg: 'transparent',
          sunbeamOpacity: 0,
          spotlightBg: 'transparent',
          spotlightOpacity: 0,
          shimmerOpacity: 0
        },
        {
          index: 2,
          time: '12:00',
          name: 'Midday',
          hour: 12,
          isDark: false,
          glowColor: 'rgba(255, 230, 150, 0.8)',
          filter: 'brightness(1.06) contrast(1.06) saturate(1.08)',
          ambientBg: 'radial-gradient(ellipse at 50% 10%, rgba(255, 250, 230, 0.35) 0%, transparent 70%)',
          ambientMix: 'overlay',
          ambientOpacity: 0.6,
          sunbeamBg: 'radial-gradient(circle at 50% 0%, rgba(255, 255, 240, 0.3) 0%, transparent 60%)',
          sunbeamOpacity: 0.5,
          spotlightBg: 'transparent',
          spotlightOpacity: 0,
          shimmerOpacity: 0
        },
        {
          index: 3,
          time: '15:00',
          name: 'Afternoon',
          hour: 15,
          isDark: false,
          glowColor: 'rgba(255, 205, 120, 0.75)',
          filter: 'brightness(1.03) contrast(1.04) saturate(1.12) sepia(0.1)',
          ambientBg: 'linear-gradient(140deg, rgba(255, 220, 150, 0.3) 0%, transparent 70%)',
          ambientMix: 'soft-light',
          ambientOpacity: 0.75,
          sunbeamBg: 'linear-gradient(130deg, rgba(255, 210, 120, 0.25) 0%, transparent 60%)',
          sunbeamOpacity: 0.6,
          spotlightBg: 'transparent',
          spotlightOpacity: 0,
          shimmerOpacity: 0
        },
        {
          index: 4,
          time: '18:00',
          name: 'Golden Hour',
          hour: 18,
          isDark: false,
          glowColor: 'rgba(255, 160, 40, 0.85)',
          filter: 'brightness(1.04) contrast(1.14) saturate(1.28) sepia(0.24)',
          ambientBg: 'linear-gradient(125deg, rgba(255, 165, 40, 0.45) 0%, rgba(255, 110, 20, 0.25) 45%, transparent 80%)',
          ambientMix: 'color-burn',
          ambientOpacity: 0.7,
          sunbeamBg: 'linear-gradient(120deg, rgba(255, 180, 50, 0.45) 0%, rgba(255, 140, 30, 0.2) 35%, transparent 70%)',
          sunbeamOpacity: 0.85,
          spotlightBg: 'transparent',
          spotlightOpacity: 0,
          shimmerOpacity: 0.2
        },
        {
          index: 5,
          time: '20:00',
          name: 'Blue Hour',
          hour: 20,
          isDark: true,
          glowColor: 'rgba(130, 120, 220, 0.8)',
          filter: 'brightness(0.86) contrast(1.18) saturate(1.12) hue-rotate(-15deg)',
          ambientBg: 'linear-gradient(180deg, rgba(50, 45, 110, 0.45) 0%, rgba(30, 25, 70, 0.55) 100%)',
          ambientMix: 'multiply',
          ambientOpacity: 0.8,
          sunbeamBg: 'transparent',
          sunbeamOpacity: 0,
          spotlightBg: 'radial-gradient(circle at 50% 45%, rgba(255, 255, 255, 0.15) 0%, transparent 70%)',
          spotlightOpacity: 0.4,
          shimmerOpacity: 0.3
        },
        {
          index: 6,
          time: '22:00',
          name: 'Evening',
          hour: 22,
          isDark: true,
          glowColor: 'rgba(255, 145, 50, 0.8)',
          filter: 'brightness(0.74) contrast(1.26) saturate(1.18) sepia(0.18)',
          ambientBg: 'linear-gradient(190deg, rgba(255, 140, 35, 0.32) 0%, rgba(20, 15, 30, 0.6) 80%)',
          ambientMix: 'multiply',
          ambientOpacity: 0.88,
          sunbeamBg: 'radial-gradient(ellipse at 50% 30%, rgba(255, 190, 80, 0.25) 0%, transparent 65%)',
          sunbeamOpacity: 0.7,
          spotlightBg: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.2) 0%, rgba(15, 12, 25, 0.8) 85%)',
          spotlightOpacity: 0.65,
          shimmerOpacity: 0.6
        },
        {
          index: 7,
          time: '00:00',
          name: 'Midnight',
          hour: 0,
          isDark: true,
          glowColor: 'rgba(255, 255, 255, 0.9)',
          filter: 'brightness(0.60) contrast(1.38) saturate(1.1) hue-rotate(-20deg)',
          ambientBg: 'radial-gradient(circle at 50% 45%, rgba(20, 30, 55, 0.4) 0%, rgba(10, 12, 22, 0.85) 90%)',
          ambientMix: 'multiply',
          ambientOpacity: 0.95,
          sunbeamBg: 'radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.22) 0%, transparent 55%)',
          sunbeamOpacity: 0.8,
          spotlightBg: 'radial-gradient(circle at 50% 46%, rgba(255, 255, 255, 0.25) 0%, rgba(6, 8, 16, 0.92) 80%)',
          spotlightOpacity: 0.88,
          shimmerOpacity: 1.0
        }
      ];

      this.currentModeIndex = 1; // default morning
      this.isOpen = false;
      this.isDragging = false;
      this.autoCloseTimer = null;

      // Bindings
      this.onTriggerClick = this.onTriggerClick.bind(this);
      this.onPointerDown = this.onPointerDown.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerUp = this.onPointerUp.bind(this);
      this.onDotClick = this.onDotClick.bind(this);
      this.onKeyDown = this.onKeyDown.bind(this);
    }

    connectedCallback() {
      this.trigger = this.querySelector('[data-scrubber-trigger]');
      this.trackWrap = this.querySelector('[data-scrubber-track-wrap]');
      this.track = this.querySelector('[data-scrubber-track]');
      this.indicator = this.querySelector('[data-scrubber-indicator]');
      this.dots = Array.from(this.querySelectorAll('[data-scrubber-dot]'));
      this.timeDisplay = this.querySelector('[data-scrubber-time]');
      this.locationDisplay = this.querySelector('[data-scrubber-location]');
      this.tooltip = this.querySelector('[data-scrubber-tooltip]');
      this.tooltipTime = this.querySelector('.sun-scrubber__tooltip-time');
      this.tooltipName = this.querySelector('.sun-scrubber__tooltip-name');
      this.lightingStage = this.querySelector('[data-sun-lighting-stage]');

      if (this.trigger) {
        this.trigger.addEventListener('click', this.onTriggerClick);
      }

      if (this.trackWrap) {
        this.trackWrap.addEventListener('pointerdown', this.onPointerDown);
      }

      this.dots.forEach((dot) => {
        dot.addEventListener('click', this.onDotClick);
      });

      this.addEventListener('keydown', this.onKeyDown);

      // Auto-detect visitor location and local time
      this.initLocationAndTime();

      // Ensure stage is mounted inside active gallery container
      this.setupStageMount();
    }

    disconnectedCallback() {
      if (this.trigger) this.trigger.removeEventListener('click', this.onTriggerClick);
      if (this.trackWrap) this.trackWrap.removeEventListener('pointerdown', this.onPointerDown);
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('pointerup', this.onPointerUp);
      clearTimeout(this.autoCloseTimer);
    }

    /**
     * Resolves user's local city name and matches current hour to nearest mode
     */
    initLocationAndTime() {
      try {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMins = String(now.getMinutes()).padStart(2, '0');
        const formattedLocalTime = `${String(currentHour).padStart(2, '0')}:${currentMins}`;

        // Match nearest mode
        let closestModeIndex = 0;
        let smallestDiff = 999;
        this.MODES.forEach((mode, idx) => {
          let diff = Math.abs(currentHour - mode.hour);
          if (diff > 12) diff = 24 - diff;
          if (diff < smallestDiff) {
            smallestDiff = diff;
            closestModeIndex = idx;
          }
        });

        // Resolve city name from timeZone
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        let city = this.dataset.fallbackCity || 'PARIS, FR';

        if (tz) {
          const tzMap = {
            'Asia/Kolkata': 'NEW DELHI, IN',
            'Asia/Calcutta': 'MUMBAI, IN',
            'Europe/Paris': 'PARIS, FR',
            'Europe/London': 'LONDON, UK',
            'Europe/Milan': 'MILAN, IT',
            'America/New_York': 'NEW YORK, US',
            'America/Los_Angeles': 'LOS ANGELES, US',
            'Asia/Dubai': 'DUBAI, UAE',
            'Asia/Tokyo': 'TOKYO, JP',
            'Asia/Singapore': 'SINGAPORE, SG',
            'Australia/Sydney': 'SYDNEY, AU'
          };

          if (tzMap[tz]) {
            city = tzMap[tz];
          } else {
            const parts = tz.split('/');
            if (parts.length > 1) {
              const rawCity = parts[parts.length - 1].replace(/_/g, ' ').toUpperCase();
              city = `${rawCity}`;
            }
          }
        }

        if (this.locationDisplay) this.locationDisplay.textContent = city;

        // Apply detected mode
        this.setMode(closestModeIndex, false);

        // On initial landing, show the exact local clock time, then switch to mode time when user scrubs
        if (this.timeDisplay) this.timeDisplay.textContent = formattedLocalTime;
      } catch (e) {
        console.warn('[SunScrubber] time init error:', e);
        this.setMode(1, false);
      }
    }

    setupStageMount() {
      // Find parent media viewer
      const gallery = this.closest('[id^="MediaGallery-"]') || this.closest('.product__media-wrapper') || this.parentElement;
      if (gallery) {
        gallery.style.position = 'relative';
      }
    }

    onTriggerClick(e) {
      e.stopPropagation();
      this.toggleOpen(!this.isOpen);
    }

    toggleOpen(open) {
      this.isOpen = Boolean(open);
      this.classList.toggle('is-open', this.isOpen);
      if (this.trigger) {
        this.trigger.setAttribute('aria-expanded', String(this.isOpen));
      }

      if (this.isOpen) {
        this.updateIndicatorPosition();
        this.resetAutoCloseTimer();
      } else {
        clearTimeout(this.autoCloseTimer);
      }
    }

    resetAutoCloseTimer() {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = setTimeout(() => {
        if (!this.isDragging) {
          this.toggleOpen(false);
        }
      }, 3500);
    }

    onPointerDown(e) {
      this.isDragging = true;
      this.classList.add('is-dragging');
      clearTimeout(this.autoCloseTimer);

      window.addEventListener('pointermove', this.onPointerMove);
      window.addEventListener('pointerup', this.onPointerUp);

      this.handlePointerPosition(e.clientY);
    }

    onPointerMove(e) {
      if (!this.isDragging) return;
      this.handlePointerPosition(e.clientY);
    }

    onPointerUp() {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.classList.remove('is-dragging');

      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('pointerup', this.onPointerUp);

      // Snap to target mode cleanly
      this.updateIndicatorPosition();
      this.resetAutoCloseTimer();
    }

    handlePointerPosition(clientY) {
      if (!this.track) return;
      const rect = this.track.getBoundingClientRect();
      const relY = clientY - rect.top;
      const normalized = Math.max(0, Math.min(1, relY / rect.height));

      // 8 modes evenly spaced along the rail (0 to 7)
      const targetModeIndex = Math.round(normalized * (this.MODES.length - 1));
      
      // Position indicator precisely to finger while dragging
      if (this.indicator) {
        this.indicator.style.top = `${normalized * 100}%`;
      }

      if (targetModeIndex !== this.currentModeIndex) {
        this.setMode(targetModeIndex, true);
        if ('vibrate' in navigator) {
          try { navigator.vibrate(8); } catch (_) {}
        }
      }
    }

    onDotClick(e) {
      e.stopPropagation();
      const dot = e.currentTarget;
      const idx = parseInt(dot.dataset.modeIndex, 10);
      if (!isNaN(idx)) {
        this.setMode(idx, true);
        this.resetAutoCloseTimer();
      }
    }

    onKeyDown(e) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.setMode(Math.max(0, this.currentModeIndex - 1), true);
        this.toggleOpen(true);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.setMode(Math.min(this.MODES.length - 1, this.currentModeIndex + 1), true);
        this.toggleOpen(true);
      } else if (e.key === 'Escape') {
        this.toggleOpen(false);
      }
    }

    setMode(index, announce = true) {
      this.currentModeIndex = Math.max(0, Math.min(this.MODES.length - 1, index));
      const mode = this.MODES[this.currentModeIndex];

      // Update dot active state
      this.dots.forEach((d, i) => {
        d.classList.toggle('is-active', i === this.currentModeIndex);
      });

      // Update bottom left status
      if (this.timeDisplay) {
        this.timeDisplay.textContent = mode.time;
      }

      // Update tooltip
      if (this.tooltipTime) this.tooltipTime.textContent = mode.time;
      if (this.tooltipName) this.tooltipName.textContent = mode.name.toUpperCase();
      if (this.tooltip && this.track) {
        const topPercent = (this.currentModeIndex / (this.MODES.length - 1)) * 100;
        this.tooltip.style.top = `${topPercent}%`;
      }

      // Update dark mode contrast state
      this.classList.toggle('sun-scrubber--dark-mode', Boolean(mode.isDark));

      // Apply CSS variables on root / gallery
      this.applyLightingVariables(mode);

      // Reposition indicator puck unless dragging
      if (!this.isDragging) {
        this.updateIndicatorPosition();
      }

      if (announce) {
        this.dispatchEvent(new CustomEvent('sunlight:change', {
          bubbles: true,
          detail: { mode }
        }));
      }
    }

    updateIndicatorPosition() {
      if (!this.indicator) return;
      const percent = (this.currentModeIndex / (this.MODES.length - 1)) * 100;
      this.indicator.style.top = `${percent}%`;
    }

    applyLightingVariables(mode) {
      const target = this.closest('[id^="MediaGallery-"]') || document.documentElement;

      target.style.setProperty('--sun-stage-filter', mode.filter);
      target.style.setProperty('--sun-ambient-bg', mode.ambientBg);
      target.style.setProperty('--sun-ambient-mix', mode.ambientMix);
      target.style.setProperty('--sun-ambient-opacity', String(mode.ambientOpacity));
      target.style.setProperty('--sun-sunbeam-bg', mode.sunbeamBg);
      target.style.setProperty('--sun-sunbeam-opacity', String(mode.sunbeamOpacity));
      target.style.setProperty('--sun-spotlight-bg', mode.spotlightBg);
      target.style.setProperty('--sun-spotlight-opacity', String(mode.spotlightOpacity));
      target.style.setProperty('--sun-shimmer-opacity', String(mode.shimmerOpacity));
      target.style.setProperty('--sun-glow-color', mode.glowColor);
    }
  }

  customElements.define('sun-light-scrubber', SunLightScrubber);
}
