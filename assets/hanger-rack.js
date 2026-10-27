/**
 * HOUSE OF ROYALS — ATELIER CLOTHES HANGER RACK CONTROLLER
 * Faithful recreation of the Celestine by Ritika physics engine:
 * 1. Continuous harmonic oscillator physics (underdamped pendulum with natural inertia & decay).
 * 2. Clothes parting / spreading: When an outfit is hovered, the middle outfit pops out
 *    forward, while left and right outfits smoothly slide aside along the rail.
 * 3. After the cursor moves away, oscillation persists and gracefully dulls down to rest.
 * 4. Momentum transfer on cursor sweep, rail pan/drag, and secondary swing tag physics.
 */

class HangerRack {
  constructor(sectionEl) {
    this.section = sectionEl;
    this.stage = this.section.querySelector('.hanger-rack-stage');
    this.trackWrap = this.section.querySelector('.hanger-rack-track-wrap');
    this.track = this.section.querySelector('.hanger-rack-track');
    this.itemEls = Array.from(this.section.querySelectorAll('.hanger-item'));

    if (!this.track || this.itemEls.length === 0) return;

    this.section._hangerRack = this;
    window._hangerRack = this;

    // Config from dataset & Live Studio
    const rawSway = parseFloat(this.section.dataset.swayIntensity);
    const rawSpring = parseFloat(this.section.dataset.springSpeed);
    const rawDamping = parseFloat(this.section.dataset.dampingRate);
    const rawHit = parseFloat(this.section.dataset.hitForce);
    const rawSpread = parseFloat(this.section.dataset.partSpread);

    // Initial defaults (Celestine by Ritika exact values)
    let saved = null;
    try {
      const stored = localStorage.getItem('tm_hanger_physics');
      if (stored) saved = JSON.parse(stored);
    } catch (_) {}

    this.physicsConfig = {
      springK: (saved && saved.springK) || (!isNaN(rawSpring) ? 0.002 + (rawSpring - 1) * (0.020 / 9) : 0.011),
      damping: (saved && saved.damping) || (!isNaN(rawDamping) ? 0.020 + (rawDamping - 1) * (0.060 / 9) : 0.055),
      hitForce: (saved && saved.hitForce !== undefined) ? saved.hitForce : (!isNaN(rawHit) ? rawHit * 0.0019 : 0.0095),
      spread: (saved && saved.spread && saved.spread >= 100) ? saved.spread : (!isNaN(rawSpread) && rawSpread >= 100 ? rawSpread : 130),
      spreadStep: 38,
      swayFactor: (saved && saved.swayFactor) || (!isNaN(rawSway) ? 0.4 + (rawSway - 1) * (1.6 / 9) : 1.0)
    };

    this.showTuningPanel = false;
    this.nudgeEnabled = this.section.dataset.nudge !== 'false';
    this.dragEnabled = this.section.dataset.drag !== 'false';

    // Hover & interaction state
    this.hoveredIndex = -1;
    this.leaveTimeout = null;
    this.rafId = null;

    // Cursor velocity tracker
    this.lastPointerX = 0;
    this.pointerVelocityX = 0;
    this.lastPointerTime = performance.now();

    // Drag / Pan state
    this.isDragging = false;
    this.startX = 0;
    this.scrollLeft = 0;
    this.hasMovedSignificantly = false;
    this.isInitialCentering = false;
    this.hasUserScrolled = false;
    this.railFadeInterval = null;

    // Build garment physical models
    this.garments = this.itemEls.map((el, index) => {
      const assembly = el.querySelector('.hanger-assembly');
      const tag = el.querySelector('.hanger-swing-tag');

      return {
        el,
        assembly,
        tag,
        index,
        title: el.dataset.title || `Look 0${index + 1}`,
        price: el.dataset.price || '₹85,000',
        tagText: el.dataset.tag || `LOOK 0${index + 1}`,
        link: el.dataset.link || el.querySelector('a')?.getAttribute('href') || '',

        // Persistent physical simulation state (natural initial organic resting variance)
        angle: (Math.random() - 0.5) * 0.01,
        vel: 0,
        tagAngle: 0,
        tagVel: 0
      };
    });

    this.init();
  }

  init() {
    this.setupAudio();
    this.setupBenchOutfitTitle();
    this.bindPointerVelocity();
    this.bindGarmentInteractions();

    if (this.dragEnabled) {
      this.bindRailDrag();
    }

    this.bindTrackScrollMomentum();

    this.updateAlcoveBounds();
    this.updateTrackAlignment();

    // Start the rod and clothing rack from the middle
    this.centerInitialPosition();
    requestAnimationFrame(() => {
      this.centerInitialPosition();
      this.updateAlcoveBounds();
    });

    window.addEventListener('resize', () => {
      this.updateAlcoveBounds();
      this.updateTrackAlignment();
    }, { passive: true });

    if (window.ResizeObserver && this.section) {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateAlcoveBounds();
        this.updateTrackAlignment();
      });
      this.resizeObserver.observe(this.section);
    }

    window.addEventListener('load', () => {
      this.updateAlcoveBounds();
      if (!this.hasUserScrolled) {
        this.centerInitialPosition();
      }
    }, { once: true });

    // Initial wake to settle garments
    this.wakePhysics();
  }

  updateAlcoveBounds() {
    if (!this.section) return;
    const rect = this.section.getBoundingClientRect();
    const cw = rect.width;
    const ch = rect.height;
    if (!cw || !ch) return;

    // Native resolution of assets/background_final.png is 1536 x 2681
    const imgW = 1536;
    const imgH = 2681;
    const imgRatio = imgW / imgH;
    const containerRatio = cw / ch;

    let rw, rh, ox;
    if (containerRatio >= imgRatio) {
      // Width constrained (Desktop, wide screens, or standard preview aspect ratios)
      rw = cw;
      rh = imgH * (cw / imgW);
      ox = 0;
    } else {
      // Height constrained (Tall phone screens)
      rh = ch;
      rw = imgW * (ch / imgH);
      ox = (cw - rw) / 2;
    }

    const scale = rw / imgW;
    // Exactly at the red line reference markers:
    // Left teal board inner edge: x=412 at top rail, x=430 at bottom
    // Right teal board inner edge: x=1128 at top rail, x=1126 at bottom
    const topLeft = Math.max(0, ox + 412 * scale);
    const topRight = Math.min(cw, ox + 1128 * scale);
    const botLeft = Math.max(0, ox + 430 * scale);
    const botRight = Math.min(cw, ox + 1126 * scale);

    const clipValue = `polygon(${topLeft.toFixed(1)}px 0px, ${topRight.toFixed(1)}px 0px, ${botRight.toFixed(1)}px 100%, ${botLeft.toFixed(1)}px 100%)`;
    this.section.style.setProperty('--alcove-clip', clipValue);

    // Fixed vertical anchor for the hanging rod (y=595px in native background)
    const rodTop = 595 * scale - 12;
    this.section.style.setProperty('--rod-top', `${rodTop.toFixed(1)}px`);

    // Yellow bench outfit title anchor: positioned on front tufted face of yellow ottoman (y=1940px in native background)
    const benchTitleTop = 1940 * scale;
    this.section.style.setProperty('--bench-title-top', `${benchTitleTop.toFixed(1)}px`);

    // Ground the 'Join the Waitlist' button right below yellow bench cushion, towards the base (y=2160px in native background)
    const btnTop = 2160 * scale;
    this.section.style.setProperty('--btn-top', `${btnTop.toFixed(1)}px`);
  }

  centerInitialPosition() {
    if (!this.trackWrap || !this.track) return;
    const maxScroll = this.trackWrap.scrollWidth - this.trackWrap.clientWidth;
    if (maxScroll > 0) {
      this.isInitialCentering = true;
      const prevBehavior = this.trackWrap.style.scrollBehavior;
      this.trackWrap.style.scrollBehavior = 'auto';
      this.trackWrap.scrollLeft = Math.round(maxScroll / 2);
      this.scrollLeft = this.trackWrap.scrollLeft;
      this.trackWrap.scrollTop = 0;
      requestAnimationFrame(() => {
        this.trackWrap.style.scrollBehavior = prevBehavior;
        setTimeout(() => {
          this.isInitialCentering = false;
        }, 120);
      });
    }
  }

  updateTrackAlignment() {
    if (!this.track || !this.trackWrap) return;
    const isOverflowing = this.track.scrollWidth > this.trackWrap.clientWidth + 2;
    this.track.style.justifyContent = isOverflowing ? 'flex-start' : 'center';
  }

  /* --------------------------------------------------------------------------
     Atelier Audio Feedback Controller
     - Sound 1 & 2: Natural cloth & hanger contact when browsing/touching dresses
     - Sound 3: Metal sliding friction when scrolling or dragging along the metal rail bar
     -------------------------------------------------------------------------- */
  setupAudio() {
    const getSoundUrl = (key, fallback) => {
      const val = this.section.getAttribute(`data-sound-${key}`) ||
                  this.section.getAttribute(`data-sound${key}`) ||
                  this.section.dataset[`sound-${key}`] ||
                  this.section.dataset[`sound${key}`] ||
                  this.section.dataset[`sound_${key}`];
      if (val && val.trim() !== '') return val.trim();
      return fallback;
    };

    this.sound1Url = getSoundUrl(1, 'assets/sound_1.mp3');
    this.sound2Url = getSoundUrl(2, 'assets/sound_2.mp3');
    this.sound3Url = getSoundUrl(3, 'assets/sound_3.mp3');

    this.isMuted = false;
    this.audioUnlocked = false;
    this.lastDressSoundTime = 0;
    this.dressSoundToggle = false;
    this.railSoundStopTimeout = null;
    this.isRailSoundActive = false;

    // 1. Web Audio API Engine (Zero-latency polyphony)
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = AudioContextClass ? new AudioContextClass() : null;
    this.audioBuffers = { 1: null, 2: null, 3: null };

    const loadBuffer = (key, url) => {
      if (!this.audioCtx) return;
      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.arrayBuffer();
        })
        .then(arrayBuffer => this.audioCtx.decodeAudioData(arrayBuffer))
        .then(decoded => {
          this.audioBuffers[key] = decoded;
        })
        .catch(() => {
          // Fallback to HTML5 audio pool handled automatically
        });
    };

    loadBuffer(1, this.sound1Url);
    loadBuffer(2, this.sound2Url);
    loadBuffer(3, this.sound3Url);

    // 2. HTML5 Audio Pool (Robust Fallback)
    const createPool = (url, size = 4, volume = 0.65) => {
      const pool = [];
      for (let i = 0; i < size; i++) {
        try {
          const a = new Audio(url);
          a.preload = 'auto';
          a.volume = volume;
          pool.push(a);
        } catch (_) {}
      }
      return pool;
    };

    this.poolDress1 = createPool(this.sound1Url, 4, 0.65);
    this.poolDress2 = createPool(this.sound2Url, 4, 0.65);
    this.poolIndex1 = 0;
    this.poolIndex2 = 0;

    try {
      this.soundRail = new Audio(this.sound3Url);
      this.soundRail.preload = 'auto';
      this.soundRail.volume = 0.55;
      this.soundRail.loop = true;
    } catch (_) {}

    // Unlock browser audio context on first real user gesture anywhere
    let hasUnlocked = false;
    const gestureEvents = ['pointerdown', 'touchstart', 'click', 'keydown'];
    const unlock = () => {
      if (hasUnlocked) return;
      hasUnlocked = true;

      gestureEvents.forEach(evt => {
        window.removeEventListener(evt, unlock);
      });

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      this.audioUnlocked = true;
    };

    gestureEvents.forEach(evt => {
      window.addEventListener(evt, unlock, { passive: true, once: true });
    });
  }

  toggleSound() {
    this.isMuted = !this.isMuted;
    if (this.soundToggleBtn) {
      const icon = this.soundToggleBtn.querySelector('.sound-icon');
      const text = this.soundToggleBtn.querySelector('.sound-text');
      if (icon) icon.textContent = this.isMuted ? '🔇' : '🔊';
      if (text) text.textContent = this.isMuted ? 'SOUND OFF' : 'SOUND ON';
      this.soundToggleBtn.classList.toggle('is-muted', this.isMuted);
    }
    const studioSoundBtn = document.querySelector('#tuning-sound-btn');
    if (studioSoundBtn) {
      studioSoundBtn.textContent = this.isMuted ? '🔇 Sound: OFF' : '🔊 Sound: ON';
    }
    if (this.isMuted) {
      this.stopRailSlideSound();
    }
  }

  playDressSound() {
    if (this.isMuted) return;
    const now = performance.now();
    if (now - this.lastDressSoundTime < 60) return;
    this.lastDressSoundTime = now;

    // Alternate between Sound 1 and Sound 2
    this.dressSoundToggle = !this.dressSoundToggle;
    const soundKey = this.dressSoundToggle ? 1 : 2;

    // 1. Web Audio API (Zero latency, full polyphony)
    if (this.audioCtx && this.audioBuffers[soundKey]) {
      try {
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
        const source = this.audioCtx.createBufferSource();
        source.buffer = this.audioBuffers[soundKey];
        source.playbackRate.value = 0.97 + Math.random() * 0.06;

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = 0.65;

        source.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        source.start(0);
        return;
      } catch (_) {}
    }

    // 2. HTML5 Audio Pool Fallback
    const pool = soundKey === 1 ? this.poolDress1 : this.poolDress2;
    if (pool && pool.length > 0) {
      const idx = soundKey === 1 ? (this.poolIndex1++ % pool.length) : (this.poolIndex2++ % pool.length);
      const audio = pool[idx];
      if (audio) {
        try {
          audio.currentTime = 0;
          audio.volume = 0.65;
          audio.playbackRate = 0.97 + Math.random() * 0.06;
          const p = audio.play();
          if (p && p.catch) p.catch(() => {});
        } catch (_) {}
      }
    }
  }

  startRailSlideSound() {
    if (this.isMuted) return;

    clearTimeout(this.railSoundStopTimeout);
    clearInterval(this.railFadeInterval);

    if (this.isRailSoundActive) {
      this.railSoundStopTimeout = setTimeout(() => {
        this.stopRailSlideSound();
      }, 160);
      return;
    }

    this.isRailSoundActive = true;

    // 1. Web Audio Looping BufferSource
    if (this.audioCtx && this.audioBuffers[3]) {
      try {
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
        this.railWebSource = this.audioCtx.createBufferSource();
        this.railWebSource.buffer = this.audioBuffers[3];
        this.railWebSource.loop = true;

        this.railWebGain = this.audioCtx.createGain();
        this.railWebGain.gain.setValueAtTime(0.01, this.audioCtx.currentTime);
        this.railWebGain.gain.linearRampToValueAtTime(0.55, this.audioCtx.currentTime + 0.04);

        this.railWebSource.connect(this.railWebGain);
        this.railWebGain.connect(this.audioCtx.destination);
        this.railWebSource.start(0);

        this.railSoundStopTimeout = setTimeout(() => {
          this.stopRailSlideSound();
        }, 160);
        return;
      } catch (_) {}
    }

    // 2. HTML5 Audio Fallback
    if (this.soundRail) {
      try {
        this.soundRail.currentTime = 0;
        this.soundRail.volume = 0.55;
        this.soundRail.loop = true;
        const p = this.soundRail.play();
        if (p && p.catch) p.catch(() => {});
      } catch (_) {}
    }

    this.railSoundStopTimeout = setTimeout(() => {
      this.stopRailSlideSound();
    }, 160);
  }

  stopRailSlideSound() {
    if (!this.isRailSoundActive) return;
    this.isRailSoundActive = false;

    // 1. Web Audio fade out
    if (this.railWebSource && this.railWebGain && this.audioCtx) {
      try {
        const ct = this.audioCtx.currentTime;
        this.railWebGain.gain.setValueAtTime(this.railWebGain.gain.value, ct);
        this.railWebGain.gain.linearRampToValueAtTime(0.001, ct + 0.06);
        const src = this.railWebSource;
        setTimeout(() => {
          try { src.stop(); src.disconnect(); } catch (_) {}
        }, 70);
        this.railWebSource = null;
        this.railWebGain = null;
      } catch (_) {}
    }

    // 2. HTML5 Audio fade out
    if (this.soundRail && !this.soundRail.paused) {
      try {
        clearInterval(this.railFadeInterval);
        let vol = this.soundRail.volume;
        this.railFadeInterval = setInterval(() => {
          vol = Math.max(0, vol - 0.15);
          if (this.soundRail) this.soundRail.volume = vol;
          if (vol <= 0.05) {
            clearInterval(this.railFadeInterval);
            this.railFadeInterval = null;
            if (this.soundRail) {
              this.soundRail.pause();
              this.soundRail.currentTime = 0;
              this.soundRail.volume = 0.55;
            }
          }
        }, 16);
      } catch (_) {
        if (this.soundRail) this.soundRail.pause();
      }
    }
  }

  /* --------------------------------------------------------------------------
     1. Atelier Yellow Bench Outfit Title Display (Six Caps Typography)
     -------------------------------------------------------------------------- */
  setupBenchOutfitTitle() {
    let container = this.section.querySelector('.hanger-rack-container') || this.section;
    let titleEl = this.section.querySelector('.hanger-bench-outfit-title');
    if (!titleEl) {
      titleEl = document.createElement('a');
      titleEl.className = 'hanger-bench-outfit-title';
      titleEl.id = 'BenchOutfitTitle';
      titleEl.href = 'product-inspect.html';
      titleEl.title = 'Inspect Atelier Look';
      titleEl.innerHTML = '<span class="bench-outfit-text">Teekhi Bella Outfit 1</span>';
      container.appendChild(titleEl);
    }
    this.benchOutfitTitle = titleEl;
    this.benchOutfitText = titleEl.querySelector('.bench-outfit-text') || titleEl;

    // Direct inspect link clicking with audio feedback
    this.benchOutfitTitle.addEventListener('click', () => {
      this.playDressSound();
    });

    // Hidden initially: do NOT show until an outfit is being seen in front view
    this.hideBenchOutfitTitle();
  }

  showBenchOutfitTitle(g, index) {
    if (!this.benchOutfitTitle) {
      this.setupBenchOutfitTitle();
    }
    this.updateBenchOutfitTitle(g, index);
    if (this.benchOutfitTitle) {
      this.benchOutfitTitle.classList.add('is-visible');
    }
  }

  hideBenchOutfitTitle() {
    if (this.benchOutfitTitle) {
      this.benchOutfitTitle.classList.remove('is-visible');
    }
  }

  updateBenchOutfitTitle(g, index) {
    if (!this.benchOutfitTitle) {
      this.setupBenchOutfitTitle();
    }
    if (!this.benchOutfitTitle || !this.benchOutfitText) return;

    const outfitNum = (index !== undefined && index !== null && index >= 0) ? index + 1 : 1;
    let displayName = `Teekhi Bella Outfit ${outfitNum}`;
    if (g && g.el && g.el.dataset.outfitName) {
      displayName = g.el.dataset.outfitName;
    }

    if (this.benchOutfitText.textContent.trim() !== displayName) {
      this.benchOutfitText.style.opacity = '0';
      this.benchOutfitText.style.transform = 'translateY(3px)';
      setTimeout(() => {
        this.benchOutfitText.textContent = displayName;
        this.benchOutfitText.style.opacity = '1';
        this.benchOutfitText.style.transform = 'translateY(0)';
      }, 70);
    }

    const isHtmlOrFile = (window.location.pathname.endsWith('.html') || window.location.protocol === 'file:');
    const defaultInspect = isHtmlOrFile ? 'product-inspect.html' : '/pages/product-inspect';
    let targetLink = (g && g.link) || defaultInspect;
    if (!targetLink || targetLink === '#' || targetLink.includes('waitlist') || targetLink.includes('/products/skirt')) {
      targetLink = defaultInspect;
    }
    this.benchOutfitTitle.href = targetLink;
  }

  getClosestCenterGarmentIndex() {
    if (!this.trackWrap || !this.garments || !this.garments.length) return 0;
    const wrapRect = this.trackWrap.getBoundingClientRect();
    const centerX = wrapRect.left + wrapRect.width / 2;
    let closestIndex = 0;
    let minDistance = Infinity;

    this.garments.forEach((g, idx) => {
      const gRect = g.el.getBoundingClientRect();
      const gCenterX = gRect.left + gRect.width / 2;
      const dist = Math.abs(gCenterX - centerX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = idx;
      }
    });
    return closestIndex;
  }

  // Legacy compatibility: floating pop-up cards are hidden in favor of yellow bench title
  setupFloatingCard() {
    this.setupBenchOutfitTitle();
  }

  showFloatingCard(g) {
    const idx = this.garments.indexOf(g);
    this.updateBenchOutfitTitle(g, idx >= 0 ? idx : 0);
  }

  hideFloatingCard() {
    if (this.hoveredIndex < 0) {
      const centerIdx = this.getClosestCenterGarmentIndex();
      if (this.garments[centerIdx]) {
        this.updateBenchOutfitTitle(this.garments[centerIdx], centerIdx);
      }
    }
  }

  /* --------------------------------------------------------------------------
     2. Cursor Velocity Tracking
     -------------------------------------------------------------------------- */
  bindPointerVelocity() {
    this.section.addEventListener('pointermove', (e) => {
      const now = performance.now();
      const dt = Math.max(now - this.lastPointerTime, 10);
      const dx = e.clientX - this.lastPointerX;

      this.pointerVelocityX = (dx / dt) * 16.6; // normalized velocity
      this.lastPointerX = e.clientX;
      this.lastPointerTime = now;
    }, { passive: true });
  }

  /* --------------------------------------------------------------------------
     3. Celestine Continuous Damped Harmonic Oscillator Physics Engine
     -------------------------------------------------------------------------- */
  wakePhysics() {
    if (this.rafId) return;

    const step = () => {
      let isStillOscillating = false;

      const { springK, damping } = this.physicsConfig;

      for (const g of this.garments) {
        // Torque = -springK * angle - damping * velocity
        const torque = -springK * g.angle - damping * g.vel;
        g.vel += torque;
        g.angle += g.vel;

        // Has the garment settled yet?
        if (Math.abs(g.angle) > 0.0001 || Math.abs(g.vel) > 0.0001) {
          isStillOscillating = true;
        }

        // Apply rotation to assembly (hook anchored at 50% 0px)
        const angleDeg = g.angle * (180 / Math.PI);
        if (g.assembly) {
          g.assembly.style.transform = `rotateZ(${angleDeg.toFixed(3)}deg)`;
        }

        // Tag physics (Celestine constants: yt=0.005, wt=0.06, Et=0.045)
        if (g.tag) {
          const tagTorque = -0.005 * g.tagAngle - 0.06 * g.tagVel - g.vel * 0.045;
          g.tagVel += tagTorque;
          g.tagAngle += g.tagVel;

          if (Math.abs(g.tagAngle) > 0.0001 || Math.abs(g.tagVel) > 0.0001) {
            isStillOscillating = true;
          }

          const tagDeg = g.tagAngle * (180 / Math.PI);
          g.tag.style.transform = `rotateZ(${tagDeg.toFixed(2)}deg)`;
        }
      }

      // Keep running continuously until all clothes gently come to rest
      if (isStillOscillating) {
        this.rafId = requestAnimationFrame(step);
      } else {
        this.rafId = null;
      }
    };

    this.rafId = requestAnimationFrame(step);
  }

  /* --------------------------------------------------------------------------
     4. Garment Parting, Pop-Out & Tactile "Hit" Physics
     -------------------------------------------------------------------------- */
  bindGarmentInteractions() {
    this.garments.forEach((g, index) => {
      const itemEl = g.el;

      // Mouse and pointer hover detection
      const handleEnter = (e) => {
        if (this.isDragging || (e && e.pointerType === 'touch')) return;
        this.setHovered(index, e);
      };

      itemEl.addEventListener('pointerenter', handleEnter);
      itemEl.addEventListener('mouseenter', handleEnter);
      itemEl.addEventListener('pointermove', handleEnter);

      // Touch / mouse contact with dress
      itemEl.addEventListener('pointerdown', () => {
        this.playDressSound();
      }, { passive: true });

      itemEl.addEventListener('pointerleave', (e) => {
        if (e && e.pointerType === 'touch') return;
        this.queueClearHover();
      });
      itemEl.addEventListener('mouseleave', () => {
        this.queueClearHover();
      });

      // Hitbox click handling & touch tap support
      const hitbox = itemEl.querySelector('.hanger-action-hitbox');
      if (hitbox) {
        hitbox.addEventListener('pointerenter', handleEnter);
        hitbox.addEventListener('mouseenter', handleEnter);
        hitbox.addEventListener('click', (e) => {
          if (this.hasMovedSignificantly) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }

          this.playDressSound();

          // On touch tap or click, activate this garment
          if (this.hoveredIndex !== index) {
            this.setHovered(index, e);
          }
        });
      }
    });

    // When pointer leaves the entire track or section
    this.trackWrap.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'touch') return;
      this.queueClearHover();
    });

    // Touch tap outside dismisses active state
    this.section.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' && !e.target.closest('.hanger-item') && !e.target.closest('.hanger-floating-card')) {
        this.queueClearHover();
      }
    });
  }

  setHovered(activeIndex, e) {
    clearTimeout(this.leaveTimeout);
    if (this.hoveredIndex === activeIndex) return;
    this.hoveredIndex = activeIndex;

    // Play Sound 1 or Sound 2 when browsing through or touching one of the dresses
    this.playDressSound();

    const { spread, spreadStep, hitForce, swayFactor } = this.physicsConfig;

    // Directional sweep velocity from cursor entry
    const sweepX = (e && e.movementX) ? e.movementX : (Math.random() > 0.5 ? 4 : -4);
    const clampedSweep = Math.max(-12, Math.min(12, sweepX));

    this.garments.forEach((g, idx) => {
      if (idx === activeIndex) {
        // 1. Hovered outfit takes center stage
        g.el.style.setProperty('--part-shift', '0px');
        g.el.style.setProperty('--rack-z', '40');
        g.el.classList.add('is-popped-out');
        g.el.classList.add('is-hovered');

        // Hovered outfit receives crisp directional entry impulse
        g.vel += clampedSweep * 0.0016 * swayFactor;
        g.vel = Math.max(-0.016, Math.min(0.016, g.vel));
      } else {
        // 2. Left and right outfits part along the rail and "HIT" one another!
        const dist = Math.abs(idx - activeIndex);
        const direction = idx < activeIndex ? -1 : 1;
        const shiftPx = direction * Math.max(0, spread - (dist - 1) * spreadStep);

        g.el.style.setProperty('--part-shift', `${shiftPx.toFixed(1)}px`);
        g.el.style.setProperty('--rack-z', `${Math.max(1, 20 - dist)}`);
        g.el.classList.remove('is-popped-out');
        g.el.classList.remove('is-hovered');

        // Tactile contact bump to neighbors
        if (dist === 1) {
          g.vel += direction * hitForce * swayFactor; // Immediate neighbor tactile hit
        } else if (dist === 2) {
          g.vel += direction * (hitForce * 0.38) * swayFactor; // Secondary ripple wave to next dress
        }

        // Strict safety clamp: prevents garments from ever flying off screen
        g.vel = Math.max(-0.018, Math.min(0.018, g.vel));
      }
    });

    // Reveal the outfit name on the yellow sofa now that the outfit is in front view!
    this.showBenchOutfitTitle(this.garments[activeIndex], activeIndex);

    this.showFloatingCard(this.garments[activeIndex]);
    this.wakePhysics();
  }

  queueClearHover() {
    clearTimeout(this.leaveTimeout);
    // 260ms unhover debounce to allow comfortable cursor transition to floating card
    this.leaveTimeout = setTimeout(() => {
      this.hoveredIndex = -1;

      // Smoothly slide all parted clothes back to original resting rail slots
      this.garments.forEach((g) => {
        g.el.style.setProperty('--part-shift', '0px');
        g.el.style.setProperty('--rack-z', '1');
        g.el.classList.remove('is-popped-out');
        g.el.classList.remove('is-hovered');
      });

      // Hide outfit name from yellow sofa since outfit is no longer in front view
      this.hideBenchOutfitTitle();

      this.hideFloatingCard();

      // Physics loop continues naturally: clothes sway and damp down to rest
    }, 260);
  }

  /* --------------------------------------------------------------------------
     5. Rail Horizontal Drag & Scroll Momentum (Celestine formulas)
     -------------------------------------------------------------------------- */
  bindTrackScrollMomentum() {
    let lastScroll = this.trackWrap.scrollLeft;

    this.trackWrap.addEventListener('scroll', () => {
      // Guarantee the dressing rack never moves vertically
      if (this.trackWrap.scrollTop !== 0) {
        this.trackWrap.scrollTop = 0;
      }

      const currentScroll = this.trackWrap.scrollLeft;
      const delta = currentScroll - lastScroll;
      lastScroll = currentScroll;

      if (this.isInitialCentering) return;
      this.hasUserScrolled = true;

      // Play Sound 3 when scrolling through the metal bar
      if (Math.abs(delta) > 1) {
        this.startRailSlideSound();
      }

      if (this.isDragging) return;

      const { swayFactor } = this.physicsConfig;
      const clamped = Math.max(-30, Math.min(30, delta));
      for (const g of this.garments) {
        g.vel += -clamped * 0.00018 * swayFactor;
        g.vel = Math.max(-0.015, Math.min(0.015, g.vel));
      }
      this.wakePhysics();

      // Only show/update bench outfit title if an outfit is currently in front view!
      if (this.hoveredIndex >= 0 && this.garments[this.hoveredIndex]) {
        this.updateBenchOutfitTitle(this.garments[this.hoveredIndex], this.hoveredIndex);
      } else {
        this.hideBenchOutfitTitle();
      }
    }, { passive: true });

    this.trackWrap.addEventListener('touchmove', () => {
      if (this.trackWrap.scrollTop !== 0) {
        this.trackWrap.scrollTop = 0;
      }
    }, { passive: true });

    this.trackWrap.addEventListener('wheel', () => {
      if (this.trackWrap.scrollTop !== 0) {
        this.trackWrap.scrollTop = 0;
      }
    }, { passive: true });
  }

  bindRailDrag() {
    const wrap = this.trackWrap;

    const onPointerMove = (e) => {
      if (!this.isDragging) return;
      e.preventDefault();
      if (wrap.scrollTop !== 0) {
        wrap.scrollTop = 0;
      }
      const x = e.pageX - wrap.offsetLeft;
      const walk = (x - this.startX) * 1.2;

      if (Math.abs(walk) > 3) {
        this.hasMovedSignificantly = true;
        // Play Sound 3 when sliding along the metal bar
        this.startRailSlideSound();
      }
      wrap.scrollLeft = this.scrollLeft - walk;

      // Transfer drag velocity to garments
      if (Math.abs(e.movementX) > 2) {
        const { swayFactor } = this.physicsConfig;
        for (const g of this.garments) {
          g.vel += -Math.sign(e.movementX) * Math.min(Math.abs(e.movementX) * 0.0002, 0.004) * swayFactor;
          g.vel = Math.max(-0.015, Math.min(0.015, g.vel));
        }
        this.wakePhysics();
      }
    };

    const onPointerUp = () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      wrap.classList.remove('is-dragging');
      this.stopRailSlideSound();
      window.removeEventListener('pointermove', onPointerMove);

      setTimeout(() => {
        this.hasMovedSignificantly = false;
      }, 50);
    };

    const onPointerDown = (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      this.isDragging = true;
      this.hasUserScrolled = true;
      this.hasMovedSignificantly = false;
      this.startX = e.pageX - wrap.offsetLeft;
      this.scrollLeft = wrap.scrollLeft;
      wrap.scrollTop = 0;
      wrap.classList.add('is-dragging');
      window.addEventListener('pointermove', onPointerMove, { passive: false });
    };

    wrap.addEventListener('pointerdown', onPointerDown);
    this.stage?.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  /* --------------------------------------------------------------------------
     6. Live Interactive Physics Studio Floating Panel
     -------------------------------------------------------------------------- */
  setupTuningPanel() {
    return; // Disabled: Physics Studio icon removed
    if (document.querySelector('.hanger-tuning-studio')) return;

    const panel = document.createElement('div');
    panel.className = 'hanger-tuning-studio is-collapsed';
    panel.innerHTML = `
      <button class="tuning-toggle-btn" type="button" aria-label="Toggle Physics Studio">
        <span class="tuning-icon">⚙️</span>
        <span class="tuning-btn-text">Physics Studio</span>
      </button>

      <div class="tuning-panel-body">
        <div class="tuning-header">
          <div>
            <div class="tuning-title">✦ HANGER PHYSICS STUDIO</div>
            <div class="tuning-desc">Live sway speed, contact hit & damping controls</div>
          </div>
          <button class="tuning-close-btn" type="button" title="Minimize">✕</button>
        </div>

        <div class="tuning-presets">
          <button class="preset-btn is-active" data-preset="celestine" type="button">✨ Celestine</button>
          <button class="preset-btn" data-preset="calm" type="button">🕊️ Calm</button>
          <button class="preset-btn" data-preset="dynamic" type="button">⚡ Dynamic</button>
          <button class="preset-btn" id="tuning-sound-btn" type="button" title="Toggle audio feedback">🔊 Sound: ON</button>
        </div>

        <div class="tuning-slider-group">
          <div class="tuning-row">
            <div class="tuning-label-wrap">
              <span class="tuning-label">Swing Speed (Stiffness)</span>
              <span class="tuning-val" id="val-spring">${this.physicsConfig.springK.toFixed(3)}</span>
            </div>
            <input type="range" id="slider-spring" min="0.002" max="0.024" step="0.001" value="${this.physicsConfig.springK.toFixed(3)}">
          </div>

          <div class="tuning-row">
            <div class="tuning-label-wrap">
              <span class="tuning-label">Air Damping (Settle Rate)</span>
              <span class="tuning-val" id="val-damping">${this.physicsConfig.damping.toFixed(3)}</span>
            </div>
            <input type="range" id="slider-damping" min="0.015" max="0.090" step="0.005" value="${this.physicsConfig.damping.toFixed(3)}">
          </div>

          <div class="tuning-row">
            <div class="tuning-label-wrap">
              <span class="tuning-label">Neighbor Hit Force</span>
              <span class="tuning-val" id="val-hit">${this.physicsConfig.hitForce.toFixed(4)}</span>
            </div>
            <input type="range" id="slider-hit" min="0.000" max="0.018" step="0.001" value="${this.physicsConfig.hitForce.toFixed(4)}">
          </div>

          <div class="tuning-row">
            <div class="tuning-label-wrap">
              <span class="tuning-label">Rail Parting Spread</span>
              <span class="tuning-val" id="val-spread">${this.physicsConfig.spread}px</span>
            </div>
            <input type="range" id="slider-spread" min="20" max="80" step="2" value="${this.physicsConfig.spread}">
          </div>

          <div class="tuning-row">
            <div class="tuning-label-wrap">
              <span class="tuning-label">Sway Sensitivity</span>
              <span class="tuning-val" id="val-sway">${this.physicsConfig.swayFactor.toFixed(1)}x</span>
            </div>
            <input type="range" id="slider-sway" min="0.2" max="2.4" step="0.1" value="${this.physicsConfig.swayFactor.toFixed(1)}">
          </div>
        </div>

        <div class="tuning-footer">
          <button class="tuning-btn-secondary" id="tuning-reset" type="button">Reset Defaults</button>
          <button class="tuning-btn-primary" id="tuning-copy" type="button">Copy JSON</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Bind events
    const toggleBtn = panel.querySelector('.tuning-toggle-btn');
    const closeBtn = panel.querySelector('.tuning-close-btn');

    toggleBtn.addEventListener('click', () => {
      panel.classList.toggle('is-collapsed');
    });
    closeBtn.addEventListener('click', () => {
      panel.classList.add('is-collapsed');
    });

    const springSlider = panel.querySelector('#slider-spring');
    const dampingSlider = panel.querySelector('#slider-damping');
    const hitSlider = panel.querySelector('#slider-hit');
    const spreadSlider = panel.querySelector('#slider-spread');
    const swaySlider = panel.querySelector('#slider-sway');

    const valSpring = panel.querySelector('#val-spring');
    const valDamping = panel.querySelector('#val-damping');
    const valHit = panel.querySelector('#val-hit');
    const valSpread = panel.querySelector('#val-spread');
    const valSway = panel.querySelector('#val-sway');

    const presetBtns = panel.querySelectorAll('.preset-btn');

    const presets = {
      celestine: { springK: 0.011, damping: 0.055, hitForce: 0.0095, spread: 50, swayFactor: 1.0 },
      calm: { springK: 0.003, damping: 0.025, hitForce: 0.0030, spread: 36, swayFactor: 0.6 },
      dynamic: { springK: 0.018, damping: 0.045, hitForce: 0.0140, spread: 60, swayFactor: 1.3 }
    };

    const updateUI = () => {
      springSlider.value = this.physicsConfig.springK;
      valSpring.textContent = this.physicsConfig.springK.toFixed(3);

      dampingSlider.value = this.physicsConfig.damping;
      valDamping.textContent = this.physicsConfig.damping.toFixed(3);

      hitSlider.value = this.physicsConfig.hitForce;
      valHit.textContent = this.physicsConfig.hitForce.toFixed(4);

      spreadSlider.value = this.physicsConfig.spread;
      valSpread.textContent = `${this.physicsConfig.spread}px`;

      swaySlider.value = this.physicsConfig.swayFactor;
      valSway.textContent = `${this.physicsConfig.swayFactor.toFixed(1)}x`;

      try {
        localStorage.setItem('tm_hanger_physics', JSON.stringify(this.physicsConfig));
      } catch (_) {}
    };

    springSlider.addEventListener('input', (e) => {
      this.physicsConfig.springK = parseFloat(e.target.value);
      valSpring.textContent = this.physicsConfig.springK.toFixed(3);
      presetBtns.forEach(b => b.classList.remove('is-active'));
      this.wakePhysics();
      updateUI();
    });

    dampingSlider.addEventListener('input', (e) => {
      this.physicsConfig.damping = parseFloat(e.target.value);
      valDamping.textContent = this.physicsConfig.damping.toFixed(3);
      presetBtns.forEach(b => b.classList.remove('is-active'));
      this.wakePhysics();
      updateUI();
    });

    hitSlider.addEventListener('input', (e) => {
      this.physicsConfig.hitForce = parseFloat(e.target.value);
      valHit.textContent = this.physicsConfig.hitForce.toFixed(4);
      presetBtns.forEach(b => b.classList.remove('is-active'));
      updateUI();
    });

    spreadSlider.addEventListener('input', (e) => {
      this.physicsConfig.spread = parseInt(e.target.value, 10);
      valSpread.textContent = `${this.physicsConfig.spread}px`;
      presetBtns.forEach(b => b.classList.remove('is-active'));
      updateUI();
    });

    swaySlider.addEventListener('input', (e) => {
      this.physicsConfig.swayFactor = parseFloat(e.target.value);
      valSway.textContent = `${this.physicsConfig.swayFactor.toFixed(1)}x`;
      presetBtns.forEach(b => b.classList.remove('is-active'));
      updateUI();
    });

    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        presetBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const p = presets[btn.dataset.preset];
        if (p) {
          Object.assign(this.physicsConfig, p);
          updateUI();
          this.wakePhysics();
        }
      });
    });

    panel.querySelector('#tuning-reset').addEventListener('click', () => {
      Object.assign(this.physicsConfig, presets.celestine);
      presetBtns.forEach(b => b.classList.remove('is-active'));
      panel.querySelector('[data-preset="celestine"]')?.classList.add('is-active');
      updateUI();
      this.wakePhysics();
    });

    panel.querySelector('#tuning-copy').addEventListener('click', (e) => {
      const text = JSON.stringify(this.physicsConfig, null, 2);
      navigator.clipboard.writeText(text).then(() => {
        const btn = e.target;
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = orig; }, 1500);
      });
    });

    const soundBtn = panel.querySelector('#tuning-sound-btn');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        this.isMuted = !this.isMuted;
        soundBtn.textContent = this.isMuted ? '🔇 Sound: OFF' : '🔊 Sound: ON';
        if (this.isMuted) {
          this.stopRailSlideSound();
        } else {
          this.playDressSound();
        }
      });
    }

    updateUI();
  }
}

// Automatic Initialization for Shopify Themes
function initHangerRacks() {
  document.querySelectorAll('.hanger-rack-section').forEach((section) => {
    if (!section.dataset.initialized) {
      new HangerRack(section);
      section.dataset.initialized = 'true';
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHangerRacks);
} else {
  initHangerRacks();
}

// Shopify Theme Editor Support
document.addEventListener('shopify:section:load', (event) => {
  const section = event.target.querySelector('.hanger-rack-section');
  if (section) {
    new HangerRack(section);
    section.dataset.initialized = 'true';
  }
});
