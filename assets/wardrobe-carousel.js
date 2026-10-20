/**
 * THE MAGIC WARDROBE (ATELIER PORTAL) CONTROLLER
 * Manages in-place outfit cycling, pointer/touch swipe, indicators, and tabs.
 */

class MagicWardrobe {
  constructor(sectionEl) {
    this.section = sectionEl;
    this.stageInner = this.section.querySelector('.magic-wardrobe-stage-inner');
    this.slides = Array.from(this.section.querySelectorAll('.magic-outfit-slide'));
    this.tabs = Array.from(this.section.querySelectorAll('.magic-selector-tab'));
    this.prevBtn = this.section.querySelector('.magic-nav-btn.nav-prev');
    this.nextBtn = this.section.querySelector('.magic-nav-btn.nav-next');
    
    // Indicator elements
    this.indicatorLabel = this.section.querySelector('.active-look-label');
    this.indicatorName = this.section.querySelector('.active-look-name');

    this.currentIndex = 0;
    this.totalSlides = this.slides.length;
    if (this.totalSlides === 0) return;

    // Settings
    this.autoCycleEnabled = this.section.dataset.autoCycle !== 'false';
    this.speed = (parseFloat(this.section.dataset.speed) || 4) * 1000;
    this.cycleTimer = null;
    this.isPaused = false;
    this.isIntersecting = false;

    // Swipe tracking
    this.startX = 0;
    this.startY = 0;
    this.isPointerDown = false;

    this.init();
  }

  init() {
    this.bindEvents();
    this.setupIntersectionObserver();
    this.updateIndicator(0);

    if (this.autoCycleEnabled) {
      this.startCycle();
    }
  }

  bindEvents() {
    // Nav Chevrons
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.prev();
        this.resetTimer();
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.next();
        this.resetTimer();
      });
    }

    // Selector Tabs
    this.tabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const targetIdx = parseInt(tab.dataset.index, 10);
        if (!isNaN(targetIdx) && targetIdx !== this.currentIndex) {
          this.goTo(targetIdx);
          this.resetTimer();
        }
      });
    });

    // Hover Pause on Stage
    if (this.stageInner) {
      this.stageInner.addEventListener('mouseenter', () => {
        this.isPaused = true;
      });

      this.stageInner.addEventListener('mouseleave', () => {
        this.isPaused = false;
      });

      // Pointer / Swipe Handling
      this.stageInner.addEventListener('pointerdown', (e) => {
        this.isPointerDown = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
      });

      this.stageInner.addEventListener('pointerup', (e) => {
        if (!this.isPointerDown) return;
        this.isPointerDown = false;

        const deltaX = e.clientX - this.startX;
        const deltaY = e.clientY - this.startY;

        // Ensure horizontal swipe dominant
        if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX < 0) {
            this.next();
          } else {
            this.prev();
          }
          this.resetTimer();
        }
      });

      this.stageInner.addEventListener('pointercancel', () => {
        this.isPointerDown = false;
      });
    }

    // Keyboard Navigation
    document.addEventListener('keydown', (e) => {
      if (!this.isIntersecting) return;
      if (e.key === 'ArrowLeft') {
        this.prev();
        this.resetTimer();
      } else if (e.key === 'ArrowRight') {
        this.next();
        this.resetTimer();
      }
    });
  }

  setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) {
      this.isIntersecting = true;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          this.isIntersecting = entry.isIntersecting;
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(this.section);
  }

  goTo(newIndex) {
    if (newIndex < 0) {
      newIndex = this.totalSlides - 1;
    } else if (newIndex >= this.totalSlides) {
      newIndex = 0;
    }

    if (newIndex === this.currentIndex) return;

    // Remove active from old slide
    this.slides[this.currentIndex].classList.remove('is-active');
    if (this.tabs[this.currentIndex]) {
      this.tabs[this.currentIndex].classList.remove('is-active');
      this.tabs[this.currentIndex].setAttribute('aria-selected', 'false');
    }

    // Add active to new slide
    this.currentIndex = newIndex;
    this.slides[this.currentIndex].classList.add('is-active');

    if (this.tabs[this.currentIndex]) {
      this.tabs[this.currentIndex].classList.add('is-active');
      this.tabs[this.currentIndex].setAttribute('aria-selected', 'true');

      // Scroll tab into view if horizontal overflow on mobile
      this.tabs[this.currentIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }

    this.updateIndicator(this.currentIndex);
  }

  next() {
    this.goTo(this.currentIndex + 1);
  }

  prev() {
    this.goTo(this.currentIndex - 1);
  }

  updateIndicator(index) {
    const activeSlide = this.slides[index];
    if (!activeSlide) return;

    const tag = activeSlide.dataset.tag || `LOOK 0${index + 1}`;
    const title = activeSlide.dataset.title || 'Partywear Outfit';

    if (this.indicatorLabel) {
      this.indicatorLabel.textContent = `${tag} OF 0${this.totalSlides}`;
    }

    if (this.indicatorName) {
      this.indicatorName.textContent = title;
    }
  }

  startCycle() {
    this.stopCycle();
    this.cycleTimer = setInterval(() => {
      if (!this.isPaused && this.isIntersecting) {
        this.next();
      }
    }, this.speed);
  }

  stopCycle() {
    if (this.cycleTimer) {
      clearInterval(this.cycleTimer);
      this.cycleTimer = null;
    }
  }

  resetTimer() {
    if (!this.autoCycleEnabled) return;
    this.stopCycle();
    this.startCycle();
  }
}

// Initialize on DOM ready & Shopify Theme Editor events
document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('.magic-wardrobe-section');
  sections.forEach((section) => new MagicWardrobe(section));
});

if (window.Shopify && window.Shopify.designMode) {
  document.addEventListener('shopify:section:load', (e) => {
    const section = e.target.querySelector('.magic-wardrobe-section');
    if (section) new MagicWardrobe(section);
  });

  document.addEventListener('shopify:block:select', (e) => {
    const slide = e.target.closest('.magic-outfit-slide');
    if (slide && slide.dataset.index) {
      const wardrobeSection = slide.closest('.magic-wardrobe-section');
      if (wardrobeSection) {
        const instance = new MagicWardrobe(wardrobeSection);
        instance.goTo(parseInt(slide.dataset.index, 10));
      }
    }
  });
}
