/**
 * Hero 3D Cylindrical Carousel Controller (Kai Marlow Style)
 * High-performance 3D spatial rotation engine with drag momentum,
 * dynamic spherical lighting, and smooth auto-spin.
 */

class Hero3dCylinderCarousel {
  constructor(container) {
    this.container = container;
    this.viewport = container.querySelector('.hero-3d-viewport');
    this.cylinder = container.querySelector('.hero-3d-cylinder');
    this.cards = Array.from(container.querySelectorAll('.hero-3d-card'));
    
    if (!this.cylinder || this.cards.length === 0) return;

    // Configuration from dataset
    this.baseSpeed = parseFloat(container.dataset.speed || '14'); // deg per second
    this.tilt = parseFloat(container.dataset.tilt || '18');
    this.dragSensitivity = parseFloat(container.dataset.dragSensitivity || '0.28');
    this.dragFriction = 0.92;
    this.dynamicLighting = container.dataset.lighting !== 'false';
    this.gap = parseFloat(container.dataset.gap || '24');

    // Runtime state
    this.currentRotation = 0;
    this.targetSpeed = this.baseSpeed;
    this.currentVelocity = 0;
    this.isDragging = false;
    this.hasDragged = false;
    this.startX = 0;
    this.lastX = 0;
    this.lastTime = 0;
    this.radius = 450;
    this.cardWidth = 220;
    this.cardHeight = 320;
    this.animationFrameId = null;

    this.init();
  }

  init() {
    this.updateDimensions();
    this.layoutCylinder();
    this.bindEvents();
    
    this.lastTimestamp = performance.now();
    this.tick = this.tick.bind(this);
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  updateDimensions() {
    // Read configured card dimensions from CSS custom properties or DOM
    const computedWidth = parseFloat(getComputedStyle(this.container).getPropertyValue('--card-width'));
    const computedHeight = parseFloat(getComputedStyle(this.container).getPropertyValue('--card-height'));
    if (computedWidth > 0) this.cardWidth = computedWidth;
    if (computedHeight > 0) this.cardHeight = computedHeight;

    if (this.cards.length > 0) {
      const rect = this.cards[0].getBoundingClientRect();
      if (rect.width > 0) this.cardWidth = rect.width;
      if (rect.height > 0) this.cardHeight = rect.height;
    }

    const n = Math.max(this.cards.length, 3);
    const halfAngle = Math.PI / n;
    // Exact polygon apothem formula: R = (width + gap) / (2 * tan(PI / n))
    // Cards sit closely adjacent to each other with minimal hairline gap
    this.radius = Math.round((this.cardWidth + this.gap) / (2 * Math.tan(halfAngle)));
    
    // Set CSS custom property for reference
    this.container.style.setProperty('--cylinder-radius', `${this.radius}px`);
  }

  layoutCylinder() {
    const total = this.cards.length;
    const angleStep = 360 / total;

    this.cards.forEach((card, index) => {
      const baseAngle = index * angleStep;
      card.dataset.baseAngle = baseAngle;
      // Position card on cylinder circle
      card.style.transform = `rotateY(${baseAngle}deg) translateZ(${this.radius}px)`;
    });

    this.updateCardLighting(0);
  }

  bindEvents() {
    // Window Resize handler
    window.addEventListener('resize', () => {
      this.updateDimensions();
      this.layoutCylinder();
    }, { passive: true });

    // Pointer events on cylinder container
    const target = this.viewport || this.cylinder;

    target.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.hasDragged = false;
      this.startX = e.clientX;
      this.lastX = e.clientX;
      this.lastTime = performance.now();
      this.currentVelocity = 0;
      this.cylinder.classList.add('is-dragging');
      target.setPointerCapture?.(e.pointerId);
    });

    target.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const now = performance.now();
      const deltaX = e.clientX - this.lastX;
      const dt = Math.max(now - this.lastTime, 1);

      if (Math.abs(e.clientX - this.startX) > 4) {
        this.hasDragged = true;
      }

      this.currentRotation += deltaX * this.dragSensitivity;
      this.currentVelocity = (deltaX / dt) * 16 * this.dragSensitivity;

      this.lastX = e.clientX;
      this.lastTime = now;
      this.applyRotation();
    });

    const stopDrag = (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.cylinder.classList.remove('is-dragging');
      if (e.pointerId && target.releasePointerCapture) {
        try { target.releasePointerCapture(e.pointerId); } catch (_) {}
      }
    };

    target.addEventListener('pointerup', stopDrag);
    target.addEventListener('pointercancel', stopDrag);

    // Prevent clicking links if the user was actively dragging
    this.cards.forEach((card) => {
      card.addEventListener('click', (e) => {
        if (this.hasDragged) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, true);
    });

    // Optional subtle scroll acceleration
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;
      const scrollDiff = currentScrollY - lastScrollY;
      lastScrollY = currentScrollY;
      if (!this.isDragging) {
        this.currentRotation += scrollDiff * 0.05;
      }
    }, { passive: true });
  }

  tick(timestamp) {
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = timestamp;

    if (!this.isDragging) {
      if (Math.abs(this.currentVelocity) > 0.01) {
        // Coasting with inertia
        this.currentRotation += this.currentVelocity;
        this.currentVelocity *= this.dragFriction;
      } else {
        // Standard continuous auto-rotation
        this.currentRotation += this.baseSpeed * dt;
      }
      this.applyRotation();
    }

    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  applyRotation() {
    this.cylinder.style.transform = `rotateY(${this.currentRotation}deg)`;
    if (this.dynamicLighting) {
      this.updateCardLighting(this.currentRotation);
    }
  }

  updateCardLighting(rotation) {
    this.cards.forEach((card) => {
      const baseAngle = parseFloat(card.dataset.baseAngle || '0');
      // Relative angle to the camera (0 deg is dead center facing camera)
      const relativeAngle = (((baseAngle + rotation) % 360) + 540) % 360 - 180;
      const rad = (relativeAngle * Math.PI) / 180;
      const cosFactor = Math.cos(rad); // 1 = front, -1 = back

      // Lighting shader equation
      const brightness = 0.5 + 0.5 * cosFactor; // 0.0 to 1.0
      const contrast = 0.85 + 0.25 * cosFactor;

      card.style.filter = `brightness(${brightness.toFixed(3)}) contrast(${contrast.toFixed(3)})`;
      
      // Dynamic z-index for clean layer stacking
      const zIndex = Math.round((cosFactor + 1) * 100);
      card.style.zIndex = zIndex;
    });
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.hero-3d-section').forEach((section) => {
    new Hero3dCylinderCarousel(section);
  });
});

// Shopify Theme Editor Section Lifecycle Support
document.addEventListener('shopify:section:load', (event) => {
  const section = event.target.querySelector('.hero-3d-section');
  if (section) {
    new Hero3dCylinderCarousel(section);
  }
});
