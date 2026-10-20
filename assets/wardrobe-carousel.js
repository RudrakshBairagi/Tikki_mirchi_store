/**
 * Tikki Bella — The Atelier Wardrobe Carousel Controller
 * Manages 3D double doors, clothes rail carousel cycling,
 * touch gestures, and scroll reveal animations.
 */

class WardrobeCarousel {
  constructor(section) {
    this.section = section;
    this.cabinet = section.querySelector('.wardrobe-cabinet');
    this.toggleBtn = section.querySelector('.wardrobe-door-toggle-btn');
    this.toggleText = section.querySelector('.door-toggle-text');
    this.doors = Array.from(section.querySelectorAll('.wardrobe-door'));
    this.cards = Array.from(section.querySelectorAll('.wardrobe-outfit-card'));
    this.interior = section.querySelector('.wardrobe-interior');
    this.prevBtn = section.querySelector('.nav-prev');
    this.nextBtn = section.querySelector('.nav-next');
    this.pagination = section.querySelector('.wardrobe-pagination');

    if (!this.cabinet || this.cards.length === 0) return;

    this.autoOpen = section.dataset.autoOpen !== 'false';
    this.autoCycle = section.dataset.autoCycle !== 'false';
    this.cycleSpeed = (parseFloat(section.dataset.speed) || 4) * 1000;

    this.isOpen = false;
    this.hasAutoOpened = false;
    this.currentIndex = 0;
    this.totalCards = this.cards.length;
    this.cycleTimer = null;

    // Drag/Touch interaction state
    this.startX = 0;
    this.currentX = 0;
    this.isDragging = false;
    this.hasDragged = false;

    this.init();
  }

  init() {
    this.buildPagination();
    this.updateCardPositions();
    this.bindEvents();
    this.setupScrollObserver();

    if (this.autoCycle) {
      this.startAutoCycle();
    }
  }

  buildPagination() {
    if (!this.pagination) return;
    this.pagination.innerHTML = '';
    this.dots = [];

    for (let i = 0; i < this.totalCards; i++) {
      const dot = document.createElement('button');
      dot.className = `wardrobe-dot ${i === 0 ? 'is-active' : ''}`;
      dot.setAttribute('aria-label', `Go to look ${i + 1}`);
      dot.addEventListener('click', () => {
        this.goTo(i);
        this.resetAutoCycle();
      });
      this.pagination.appendChild(dot);
      this.dots.push(dot);
    }
  }

  bindEvents() {
    // Door Toggle Button
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.toggleDoors());
    }

    // Clicking on the doors themselves opens them
    this.doors.forEach((door) => {
      door.addEventListener('click', (e) => {
        if (!this.isOpen) {
          e.stopPropagation();
          this.openDoors();
        }
      });
    });

    // Navigation arrows
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => {
        this.prev();
        this.resetAutoCycle();
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => {
        this.next();
        this.resetAutoCycle();
      });
    }

    // Outfit Cards Click (clicking preview card brings it to center)
    this.cards.forEach((card, idx) => {
      card.addEventListener('click', (e) => {
        if (this.hasDragged) return;
        if (idx !== this.currentIndex) {
          e.preventDefault();
          this.goTo(idx);
          this.resetAutoCycle();
        }
      });
    });

    // Pause auto-cycle on hover
    if (this.interior) {
      this.interior.addEventListener('mouseenter', () => this.stopAutoCycle());
      this.interior.addEventListener('mouseleave', () => {
        if (this.autoCycle && this.isOpen) this.startAutoCycle();
      });

      // Pointer / Touch Swipe Handling
      this.interior.addEventListener('pointerdown', (e) => {
        this.isDragging = true;
        this.hasDragged = false;
        this.startX = e.clientX;
        this.currentX = e.clientX;
        try {
          this.interior.setPointerCapture(e.pointerId);
        } catch (_) {}
      });

      this.interior.addEventListener('pointermove', (e) => {
        if (!this.isDragging) return;
        this.currentX = e.clientX;
        if (Math.abs(this.currentX - this.startX) > 8) {
          this.hasDragged = true;
        }
      });

      const handlePointerUp = (e) => {
        if (!this.isDragging) return;
        this.isDragging = false;
        if (e.pointerId && this.interior.releasePointerCapture) {
          try {
            this.interior.releasePointerCapture(e.pointerId);
          } catch (_) {}
        }

        const deltaX = this.currentX - this.startX;
        if (Math.abs(deltaX) > 40) {
          if (deltaX < 0) {
            this.next();
          } else {
            this.prev();
          }
          this.resetAutoCycle();
        }
      };

      this.interior.addEventListener('pointerup', handlePointerUp);
      this.interior.addEventListener('pointercancel', handlePointerUp);
    }

    // Keyboard navigation
    this.section.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        this.prev();
        this.resetAutoCycle();
      } else if (e.key === 'ArrowRight') {
        this.next();
        this.resetAutoCycle();
      }
    });
  }

  setupScrollObserver() {
    if (!this.autoOpen || !('IntersectionObserver' in window)) {
      this.openDoors();
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !this.hasAutoOpened) {
          this.hasAutoOpened = true;
          // Smooth staggered reveal: open doors slightly after coming into view
          setTimeout(() => {
            this.openDoors();
          }, 350);
        }
      });
    }, { threshold: 0.35 });

    observer.observe(this.cabinet);
  }

  toggleDoors() {
    if (this.isOpen) {
      this.closeDoors();
    } else {
      this.openDoors();
    }
  }

  openDoors() {
    this.isOpen = true;
    this.cabinet.classList.add('is-open');
    if (this.toggleBtn) {
      this.toggleBtn.setAttribute('aria-expanded', 'true');
    }
    if (this.toggleText) {
      this.toggleText.textContent = 'Close Wardrobe';
    }
    if (this.autoCycle) {
      this.startAutoCycle();
    }
  }

  closeDoors() {
    this.isOpen = false;
    this.cabinet.classList.remove('is-open');
    if (this.toggleBtn) {
      this.toggleBtn.setAttribute('aria-expanded', 'false');
    }
    if (this.toggleText) {
      this.toggleText.textContent = 'Open Wardrobe';
    }
    this.stopAutoCycle();
  }

  goTo(index) {
    this.currentIndex = ((index % this.totalCards) + this.totalCards) % this.totalCards;
    this.updateCardPositions();
  }

  next() {
    this.goTo(this.currentIndex + 1);
  }

  prev() {
    this.goTo(this.currentIndex - 1);
  }

  updateCardPositions() {
    const N = this.totalCards;
    this.cards.forEach((card, idx) => {
      // Calculate relative position to currentIndex with wrapping
      let diff = (idx - this.currentIndex) % N;
      if (diff > N / 2) diff -= N;
      if (diff < -N / 2) diff += N;

      card.classList.remove('is-active', 'is-prev', 'is-next', 'is-hidden');

      if (diff === 0) {
        card.classList.add('is-active');
      } else if (diff === -1) {
        card.classList.add('is-prev');
      } else if (diff === 1) {
        card.classList.add('is-next');
      } else {
        card.classList.add('is-hidden');
      }
    });

    // Update pagination dots
    if (this.dots) {
      this.dots.forEach((dot, idx) => {
        dot.classList.toggle('is-active', idx === this.currentIndex);
      });
    }
  }

  startAutoCycle() {
    this.stopAutoCycle();
    this.cycleTimer = setInterval(() => {
      if (this.isOpen) {
        this.next();
      }
    }, this.cycleSpeed);
  }

  stopAutoCycle() {
    if (this.cycleTimer) {
      clearInterval(this.cycleTimer);
      this.cycleTimer = null;
    }
  }

  resetAutoCycle() {
    if (this.autoCycle && this.isOpen) {
      this.startAutoCycle();
    }
  }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.wardrobe-section').forEach((section) => {
    new WardrobeCarousel(section);
  });
});

// Shopify Theme Editor Section Lifecycle Support
document.addEventListener('shopify:section:load', (event) => {
  const section = event.target.querySelector('.wardrobe-section');
  if (section) {
    new WardrobeCarousel(section);
  }
});
