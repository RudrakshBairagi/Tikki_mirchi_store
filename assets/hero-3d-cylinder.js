/**
 * Hero 3D Cylindrical Carousel Controller (Kai Marlow Authentic Sliced Cylinder Engine)
 * High-performance 3D spatial rotation engine using continuous multi-slice
 * cylindrical geometry to eliminate polygonal straight edges, providing
 * true continuous cylinder curvature, drag inertia, and unflattened 3D depth.
 */

class Hero3dCylinderCarousel {
  constructor(container) {
    this.container = container;
    this.viewport = container.querySelector('.hero-3d-viewport');
    this.cylinder = container.querySelector('.hero-3d-cylinder');
    
    if (!this.cylinder) return;

    // Configuration from dataset
    this.baseSpeed = parseFloat(container.dataset.speed || '14'); // deg per second
    this.tilt = parseFloat(container.dataset.tilt || '0');
    this.dragSensitivity = parseFloat(container.dataset.dragSensitivity || '0.25');
    this.dragFriction = 0.92;
    this.dynamicLighting = container.dataset.lighting !== 'false';
    this.gap = parseFloat(container.dataset.gap || '6');
    this.slicesPerCard = 16; // 16 curved vertical slices per card = 80 facets total for silky-smooth true cylinder curvature

    // Extract original cards data from DOM before building curved slices
    const originalCards = Array.from(container.querySelectorAll('.hero-3d-card'));
    if (originalCards.length === 0) return;

    this.cardData = originalCards.map((card, idx) => {
      const img = card.querySelector('img');
      const link = card.querySelector('a');
      return {
        id: idx,
        src: card.dataset.src || (img ? img.getAttribute('src') : '') || '',
        alt: img ? (img.getAttribute('alt') || `Card ${idx + 1}`) : `Card ${idx + 1}`,
        link: card.dataset.link || (link ? link.getAttribute('href') : '#') || '#'
      };
    });

    // Runtime state
    this.currentRotation = 0;
    this.targetSpeed = this.baseSpeed;
    this.currentVelocity = 0;
    this.isDragging = false;
    this.hasDragged = false;
    this.startX = 0;
    this.lastX = 0;
    this.lastTime = 0;
    this.cardWidth = 340;
    this.cardHeight = 230;
    this.cardRadius = 4;
    this.radius = 280;
    this.slices = [];
    this.animationFrameId = null;

    this.init();
  }

  init() {
    this.updateDimensions();
    this.buildCurvedCylinder();
    this.bindEvents();
    
    this.lastTimestamp = performance.now();
    this.tick = this.tick.bind(this);
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  updateDimensions() {
    const computedWidth = parseFloat(getComputedStyle(this.container).getPropertyValue('--card-width'));
    const computedHeight = parseFloat(getComputedStyle(this.container).getPropertyValue('--card-height'));
    const computedRadius = parseFloat(getComputedStyle(this.container).getPropertyValue('--card-radius'));
    
    if (computedWidth > 0) this.cardWidth = computedWidth;
    if (computedHeight > 0) this.cardHeight = computedHeight;
    if (!isNaN(computedRadius)) this.cardRadius = computedRadius;

    const N = Math.max(this.cardData.length, 3);
    // True circle circumference formula: C = N * (W + gap) => R = C / (2 * PI)
    this.radius = Math.round((N * (this.cardWidth + this.gap)) / (2 * Math.PI));
    
    this.container.style.setProperty('--cylinder-radius', `${this.radius}px`);
  }

  buildCurvedCylinder() {
    this.cylinder.innerHTML = '';
    this.slices = [];

    const N = this.cardData.length;
    const J = this.slicesPerCard;
    const W = this.cardWidth;
    const H = this.cardHeight;
    const R = this.radius;
    const angleStep = 360 / N;
    const cardArc = (W / (W + this.gap)) * angleStep;
    const sliceArc = cardArc / J;
    const sliceRads = (sliceArc * Math.PI) / 180;
    // Slight subpixel expansion (+0.6px) prevents hairline gaps on GPU rasterization
    const sliceWidth = Math.max(1, 2 * R * Math.sin(sliceRads / 2) + 0.6);

    this.cardData.forEach((card, t) => {
      const cardStartAngle = t * angleStep - cardArc / 2;

      for (let a = 0; a < J; a++) {
        const sliceAngle = cardStartAngle + (a + 0.5) * sliceArc;
        const bgX = (W / J) * a;
        const isFirst = (a === 0);
        const isLast = (a === J - 1);

        // Slice anchor in 3D space
        const slice = document.createElement('div');
        slice.className = 'hero-3d-slice';
        slice.style.position = 'absolute';
        slice.style.top = '0';
        slice.style.left = '50%';
        slice.style.width = `${sliceWidth.toFixed(2)}px`;
        slice.style.height = `${H}px`;
        slice.style.marginLeft = `${(-sliceWidth / 2).toFixed(2)}px`;
        slice.style.transformStyle = 'preserve-3d';
        slice.style.transform = `rotateY(${sliceAngle.toFixed(4)}deg) translateZ(${R}px)`;
        slice.style.willChange = 'transform';
        slice.style.overflow = 'visible';
        slice.style.userSelect = 'none';
        slice.dataset.baseAngle = sliceAngle.toString();
        slice.dataset.cardLink = card.link || '#';

        // Slice image background
        const sliceInner = document.createElement('div');
        sliceInner.className = 'hero-3d-slice-inner';
        sliceInner.style.position = 'absolute';
        sliceInner.style.inset = '0';
        sliceInner.style.backgroundImage = `url("${card.src}")`;
        sliceInner.style.backgroundRepeat = 'no-repeat';
        sliceInner.style.backgroundSize = `${W}px ${H}px`;
        sliceInner.style.backgroundPosition = `-${bgX.toFixed(2)}px 0px`;
        sliceInner.style.overflow = 'hidden';

        if (isFirst && this.cardRadius > 0) {
          sliceInner.style.borderTopLeftRadius = `${this.cardRadius}px`;
          sliceInner.style.borderBottomLeftRadius = `${this.cardRadius}px`;
        }
        if (isLast && this.cardRadius > 0) {
          sliceInner.style.borderTopRightRadius = `${this.cardRadius}px`;
          sliceInner.style.borderBottomRightRadius = `${this.cardRadius}px`;
        }

        // Shading scrim overlay (darkens back and sides naturally without filter or z-index)
        const sliceShade = document.createElement('div');
        sliceShade.className = 'hero-3d-slice-shade';
        sliceShade.style.position = 'absolute';
        sliceShade.style.inset = '0';
        sliceShade.style.backgroundColor = '#000000';
        sliceShade.style.opacity = '0';
        sliceShade.style.pointerEvents = 'none';
        sliceInner.appendChild(sliceShade);

        slice.appendChild(sliceInner);
        this.cylinder.appendChild(slice);

        this.slices.push({
          element: slice,
          shade: sliceShade,
          baseAngle: sliceAngle
        });
      }
    });

    this.updateCardLighting(0);
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.updateDimensions();
      this.buildCurvedCylinder();
    }, { passive: true });

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

    // Prevent clicking links if actively dragging
    this.cylinder.addEventListener('click', (e) => {
      if (this.hasDragged) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        const slice = e.target.closest('.hero-3d-slice');
        if (slice && slice.dataset.cardLink && slice.dataset.cardLink !== '#') {
          window.location.href = slice.dataset.cardLink;
        }
      }
    }, true);
  }

  tick(timestamp) {
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = timestamp;

    if (!this.isDragging) {
      if (Math.abs(this.currentVelocity) > 0.01) {
        this.currentRotation += this.currentVelocity;
        this.currentVelocity *= this.dragFriction;
      } else {
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
    this.slices.forEach((item) => {
      const relativeAngle = (((item.baseAngle + rotation) % 360) + 540) % 360 - 180;
      const rad = (relativeAngle * Math.PI) / 180;
      const cosFactor = Math.cos(rad); // 1 = facing front, -1 = facing back

      // Smooth cosine darkness scrim without filter or z-index (preserves pure GPU 3D depth)
      const shade = Math.max(0, Math.min(0.55, 0.55 * (1 - cosFactor) / 2));
      item.shade.style.opacity = shade.toFixed(3);
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
