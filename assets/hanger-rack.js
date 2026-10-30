/**
 * HOUSE OF ROYALS — ATELIER CLOTHES HANGER RACK CONTROLLER
 * Faithful recreation of the Celestine by Ritika physics engine:
 * 1. Continuous harmonic oscillator physics (underdamped pendulum with natural inertia & decay).
 * 2. Clothes parting / spreading: When an outfit is hovered/selected, the middle outfit pops out
 *    forward, while left and right outfits smoothly slide aside along the rail.
 * 3. After the cursor moves away, oscillation persists and gracefully dulls down to rest.
 * 4. Momentum transfer on cursor sweep, rail pan/drag, laptop mouse-wheel/trackpad horizontal scroll,
 *    and secondary swing tag physics.
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

    this.laptopLayoutMode = this.section.dataset.laptopLayout || 'wide_scrollable';
    this.soundEnabled = this.section.dataset.soundEnabled !== 'false';

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

    this.showTuningPanel = this.section.dataset.showTuning === 'true';
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
    this.selectedIndex = -1;

    // Build garment physical models
    this.garments = this.itemEls.map((el, index) => {
      const assembly = el.querySelector('.hanger-assembly');
      const tag = el.querySelector('.hanger-swing-tag');

      // Prevent native ghost image dragging on desktop browsers
      el.querySelectorAll('img').forEach((img) => {
        img.setAttribute('draggable', 'false');
        img.addEventListener('dragstart', (ev) => ev.preventDefault());
      });

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
      this.updateAlcoveBounds();
      this.updateTrackAlignment();
      this.centerInitialPosition();
    });

    window.addEventListener('resize', () => {
      this.updateAlcoveBounds();
      this.updateTrackAlignment();
      if (this.selectedIndex >= 0) {
        this.alignSelectedToScreenCenter(this.selectedIndex);
      } else if (!this.hasUserScrolled) {
        this.centerInitialPosition();
      }
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
      this.updateTrackAlignment();
      if (!this.hasUserScrolled) {
        this.centerInitialPosition();
      }
    }, { once: true });

    if (this.showTuningPanel) {
      this.setupTuningPanel();
    }

    // Initial wake to settle garments
    this.wakePhysics();
  }

  isWideView() {
    if (!this.section) return false;
    if (this.laptopLayoutMode === 'portrait_scroll') {
      return false;
    }
    const rect = this.section.getBoundingClientRect();
    const cw = rect.width;
    const ch = rect.height;
    return (cw >= 900 && (cw / ch) >= 1.05);
  }

  updateAlcoveBounds() {
    if (!this.section) return;
    const rect = this.section.getBoundingClientRect();
    const cw = rect.width;
    const ch = rect.height;
    if (!cw || !ch) return;

    const isWide = this.isWideView();

    // Native resolution and geometry:
    // Wide Desktop: assets/background_full.jpg (1024 x 549)
    // Portrait Mobile / Tall Scroll: assets/background_final.png (1536 x 2681)
    const imgW = isWide ? 1024 : 1536;
    const imgH = isWide ? 549 : 2681;
    const imgRatio = imgW / imgH;
    const containerRatio = cw / ch;

    let rw, rh, ox;
    if (containerRatio >= imgRatio) {
      // Width constrained (Wide screens or standard preview aspect ratios)
      rw = cw;
      rh = imgH * (cw / imgW);
      ox = 0;
    } else {
      // Height constrained (Tall phone screens or standard laptops)
      rh = ch;
      rw = imgW * (ch / imgH);
      ox = (cw - rw) / 2;
    }

    const scale = rw / imgW;

    // Alcove inner teal board edges:
    // Wide view: x ≈ 410px to 614px
    // Portrait view: x ≈ 412px to 1128px
    const alcoveLeftTop = isWide ? 410 : 412;
    const alcoveRightTop = isWide ? 614 : 1128;
    const alcoveLeftBot = isWide ? 410 : 430;
    const alcoveRightBot = isWide ? 614 : 1126;

    const topLeft = Math.max(0, ox + alcoveLeftTop * scale);
    const topRight = Math.min(cw, ox + alcoveRightTop * scale);
    const botLeft = Math.max(0, ox + alcoveLeftBot * scale);
    const botRight = Math.min(cw, ox + alcoveRightBot * scale);
    const alcoveWidth = Math.max(160, topRight - topLeft);

    const clipValue = `polygon(${topLeft.toFixed(1)}px 0px, ${topRight.toFixed(1)}px 0px, ${botRight.toFixed(1)}px 100%, ${botLeft.toFixed(1)}px 100%)`;
    this.section.style.setProperty('--alcove-clip', clipValue);
    this.section.style.setProperty('--alcove-width', `${alcoveWidth.toFixed(1)}px`);
    this.section.style.setProperty('--alcove-left', `${topLeft.toFixed(1)}px`);
    this.section.style.setProperty('--alcove-right', `${topRight.toFixed(1)}px`);

    // Fixed vertical anchor for the hanging rod:
    // Wide view: y ≈ 106px in native 1024x549
    // Portrait view: y ≈ 595px in native 1536x2681
    const rodTop = isWide ? (106 * scale - 6) : (595 * scale - 12);
    this.section.style.setProperty('--rod-top', `${rodTop.toFixed(1)}px`);

    // Yellow bench outfit title anchor: positioned on front tufted face of yellow ottoman:
    // Wide view: y ≈ 415px in native 1024x549
    // Portrait view: y ≈ 1940px in native 1536x2681
    const benchTitleTop = (isWide ? 415 : 1940) * scale;
    this.section.style.setProperty('--bench-title-top', `${benchTitleTop.toFixed(1)}px`);

    // Ground the 'Join the Waitlist' button towards base:
    // Wide view: y ≈ 485px in native 1024x549
    // Portrait view: y ≈ 2160px in native 1536x2681
    const btnTop = (isWide ? 485 : 2160) * scale;
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
    if (this.laptopLayoutMode === 'wide_scrollable' || !this.isWideView()) {
      this.track.style.justifyContent = 'flex-start';
      return;
    }
    const isOverflowing = this.track.scrollWidth > this.trackWrap.clientWidth + 2;
    this.track.style.justifyContent = isOverflowing ? 'flex-start' : 'center';
  }

  /* --------------------------------------------------------------------------
     Atelier Audio Feedback Controller
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

    this.isMuted = !this.soundEnabled;
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
        .catch(() => {});
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
     1. Atelier Yellow Bench Outfit Title Display
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

    let btnWrap = this.section.querySelector('.rack-waitlist-btn-wrap-bottom');
    if (!btnWrap) {
      btnWrap = document.createElement('div');
      btnWrap.className = 'rack-waitlist-btn-wrap-bottom';
      const isHtmlOrFile = (window.location.pathname.endsWith('.html') || window.location.protocol === 'file:');
      const wlLink = isHtmlOrFile ? 'waitlist.html' : '/pages/waitlist';
      btnWrap.innerHTML = `<a href="${wlLink}" class="rack-waitlist-btn" title="Join the Exclusive Waitlist"><span>JOIN THE WAITLIST</span></a>`;
      container.appendChild(btnWrap);
    }

    // Direct inspect title clicking: keep user right here on the rack, do NOT redirect
    this.benchOutfitTitle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.playDressSound();
      const activeIdx = this.hoveredIndex >= 0 ? this.hoveredIndex : 0;
      if (this.garments[activeIdx]) {
        this.setHovered(activeIdx, e);
      }
    });

    const bottomBtn = this.section.querySelector('.rack-waitlist-btn-wrap-bottom .rack-waitlist-btn');
    if (bottomBtn) {
      bottomBtn.addEventListener('click', (e) => {
        const href = bottomBtn.getAttribute('href') || '';
        if (href.startsWith('#') || document.getElementById('waitlistReservationSection')) {
          e.preventDefault();
          window.scrollToWaitlistForm();
        }
      });
    }

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

    this.benchOutfitTitle.href = 'javascript:void(0);';
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
     4. Clothing Selection & Middle of Screen Alignment Engine (Glitch-Free)
     -------------------------------------------------------------------------- */
  bindGarmentInteractions() {
    this.garments.forEach((g, index) => {
      const itemEl = g.el;

      // Mouse/Pointer hover: gentle natural cloth pendulum sway and fabric sound
      const handlePointerEnter = (e) => {
        if (this.isDragging || (e && e.pointerType === 'touch')) return;
        this.playDressSound();

        const sweepX = (e && e.movementX) ? e.movementX : (Math.random() > 0.5 ? 3 : -3);
        const clampedSweep = Math.max(-8, Math.min(8, sweepX));
        g.vel += clampedSweep * 0.0012 * this.physicsConfig.swayFactor;
        g.vel = Math.max(-0.015, Math.min(0.015, g.vel));
        this.wakePhysics();
      };

      itemEl.addEventListener('pointerenter', handlePointerEnter);
      itemEl.addEventListener('mouseenter', handlePointerEnter);

      // SELECTING A CLOTHING: click / touch tap changes X axis to the middle of the screen!
      const handleGarmentSelect = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.hasMovedSignificantly) return;

        this.playDressSound();
        this.selectClothing(index);
      };

      const hitbox = itemEl.querySelector('.hanger-action-hitbox');
      if (hitbox) {
        hitbox.addEventListener('click', handleGarmentSelect);
      }
      itemEl.addEventListener('click', handleGarmentSelect);
    });

    // Clicking anywhere outside clothes on the stage deselects and returns to resting state
    this.section.addEventListener('pointerdown', (e) => {
      if (
        !e.target.closest('.hanger-item') &&
        !e.target.closest('.hanger-bench-outfit-title') &&
        !e.target.closest('.rack-waitlist-btn') &&
        !e.target.closest('.atelier-waitlist-card')
      ) {
        if (this.selectedIndex !== -1) {
          this.selectClothing(-1);
        }
      }
    });
  }

  selectClothing(index) {
    this.selectedIndex = index;
    this.alignSelectedToScreenCenter(this.selectedIndex);

    if (this.selectedIndex >= 0) {
      const activeGarment = this.garments[this.selectedIndex];
      const lookTitle = (activeGarment && activeGarment.title) || '';
      if (window.selectOutfitInWaitlistOnly) {
        window.selectOutfitInWaitlistOnly(lookTitle, this.selectedIndex);
      }
    }
  }

  alignSelectedToScreenCenter(index) {
    // If no clothing is selected (-1), smoothly glide all clothes back to resting slots
    if (index < 0 || !this.garments[index]) {
      this.garments.forEach((g) => {
        g.el.style.setProperty('--part-shift', '0px');
        g.el.style.setProperty('--rack-z', '1');
        g.el.classList.remove('is-selected');
        g.el.classList.remove('is-popped-out');
        g.el.classList.remove('is-hovered');
      });
      this.hideBenchOutfitTitle();
      this.wakePhysics();
      return;
    }

    // Screen / Wrap middle coordinate
    const wrapWidth = this.trackWrap ? this.trackWrap.clientWidth : window.innerWidth;
    const scrollLeft = this.trackWrap ? this.trackWrap.scrollLeft : 0;
    const targetCanvasCenter = (wrapWidth / 2) + scrollLeft;

    // Layout offset of the track inside wrap
    const trackOffsetLeft = this.track ? this.track.offsetLeft : 0;

    // Resting center of the selected garment inside wrap (screen)
    const activeGarment = this.garments[index];
    const activeRestingCenter = trackOffsetLeft + activeGarment.el.offsetLeft + (activeGarment.el.offsetWidth / 2);

    // Exact shift required to change its X axis to the middle of the screen!
    const activeShift = targetCanvasCenter - activeRestingCenter;

    const isWide = this.isWideView();
    // Symmetrical clearance for the front view gown:
    const clearance = isWide ? 95 : 135;
    const neighborStep = isWide ? 26 : 42;

    this.garments.forEach((g, idx) => {
      const itemRestingCenter = trackOffsetLeft + g.el.offsetLeft + (g.el.offsetWidth / 2);

      if (idx === index) {
        // Selected clothing: positioned right at the middle of the screen!
        g.el.style.setProperty('--part-shift', `${activeShift.toFixed(1)}px`);
        g.el.style.setProperty('--rack-z', '40');
        g.el.classList.add('is-selected');
        g.el.classList.add('is-popped-out');
        g.el.classList.remove('is-hovered');

        // Tactile impulse
        g.vel += 0.003 * this.physicsConfig.swayFactor;
        g.vel = Math.max(-0.015, Math.min(0.015, g.vel));
      } else if (idx < index) {
        // Parted to the left of the middle of the screen
        const leftSteps = index - 1 - idx;
        const targetScreenX = targetCanvasCenter - clearance - (leftSteps * neighborStep);
        const shiftPx = targetScreenX - itemRestingCenter;

        g.el.style.setProperty('--part-shift', `${shiftPx.toFixed(1)}px`);
        g.el.style.setProperty('--rack-z', `${Math.max(1, 20 - Math.abs(idx - index))}`);
        g.el.classList.remove('is-selected');
        g.el.classList.remove('is-popped-out');
        g.el.classList.remove('is-hovered');
      } else {
        // Parted to the right of the middle of the screen
        const rightSteps = idx - index - 1;
        const targetScreenX = targetCanvasCenter + clearance + (rightSteps * neighborStep);
        const shiftPx = targetScreenX - itemRestingCenter;

        g.el.style.setProperty('--part-shift', `${shiftPx.toFixed(1)}px`);
        g.el.style.setProperty('--rack-z', `${Math.max(1, 20 - Math.abs(idx - index))}`);
        g.el.classList.remove('is-selected');
        g.el.classList.remove('is-popped-out');
        g.el.classList.remove('is-hovered');
      }
    });

    // Reveal outfit name on the yellow sofa
    this.showBenchOutfitTitle(activeGarment, index);
    this.wakePhysics();
  }

  setHovered(activeIndex, e) {
    this.selectClothing(activeIndex);
  }

  queueClearHover() {
    // Unhover no longer resets selected dress - selection stays stable in the middle of the screen!
  }

  /* --------------------------------------------------------------------------
     5. Rail Horizontal Drag, Mouse-Wheel/Trackpad Scroll & Momentum
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

      // Clear fixed selection parting if user scrolls along the rail
      if (this.selectedIndex !== -1 && Math.abs(delta) > 3) {
        this.selectedIndex = -1;
        this.garments.forEach((g) => {
          g.el.style.setProperty('--part-shift', '0px');
          g.el.style.setProperty('--rack-z', '1');
          g.el.classList.remove('is-selected', 'is-popped-out', 'is-hovered');
        });
      }

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

      // Update bench outfit title for the garment closest to the alcove center while scrolling
      const centerIdx = this.getClosestCenterGarmentIndex();
      if (this.garments[centerIdx]) {
        this.showBenchOutfitTitle(this.garments[centerIdx], centerIdx);
      }
    }, { passive: true });

    this.trackWrap.addEventListener('touchmove', () => {
      if (this.trackWrap.scrollTop !== 0) {
        this.trackWrap.scrollTop = 0;
      }
    }, { passive: true });

    // Laptop / Desktop Mouse-Wheel & Two-Finger Trackpad Horizontal Rack Scrolling
    const onWheel = (e) => {
      if (this.trackWrap.scrollTop !== 0) {
        this.trackWrap.scrollTop = 0;
      }

      const maxScroll = this.trackWrap.scrollWidth - this.trackWrap.clientWidth;
      if (maxScroll <= 2) return;

      // If predominantly vertical wheel/trackpad scroll over the rack, map deltaY -> scrollLeft
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        const atStart = this.trackWrap.scrollLeft <= 2 && e.deltaY < 0;
        const atEnd = this.trackWrap.scrollLeft >= maxScroll - 2 && e.deltaY > 0;

        // If inside the scrollable range of the rack, scroll the clothes horizontally!
        if (!atStart && !atEnd) {
          e.preventDefault();
          const prevBehavior = this.trackWrap.style.scrollBehavior;
          this.trackWrap.style.scrollBehavior = 'auto';
          this.trackWrap.scrollLeft += e.deltaY * 0.85;
          requestAnimationFrame(() => {
            this.trackWrap.style.scrollBehavior = prevBehavior;
          });
        }
      }
    };

    this.trackWrap.addEventListener('wheel', onWheel, { passive: false });
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
      const walk = (x - this.startX) * 1.25;

      if (Math.abs(walk) > 8) {
        this.hasMovedSignificantly = true;
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
    if (!this.showTuningPanel) return;
    if (document.querySelector('.hanger-tuning-studio')) return;

    const panel = document.createElement('div');
    panel.className = 'hanger-tuning-studio is-collapsed';
    panel.style.display = 'block';
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
            <input type="range" id="slider-spread" min="20" max="180" step="2" value="${this.physicsConfig.spread}">
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
      celestine: { springK: 0.011, damping: 0.055, hitForce: 0.0095, spread: 130, swayFactor: 1.0 },
      calm: { springK: 0.003, damping: 0.025, hitForce: 0.0030, spread: 90, swayFactor: 0.6 },
      dynamic: { springK: 0.018, damping: 0.045, hitForce: 0.0140, spread: 150, swayFactor: 1.3 }
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
      this.wakePhysics();
      updateUI();
    });

    spreadSlider.addEventListener('input', (e) => {
      this.physicsConfig.spread = parseInt(e.target.value, 10);
      valSpread.textContent = `${this.physicsConfig.spread}px`;
      presetBtns.forEach(b => b.classList.remove('is-active'));
      this.wakePhysics();
      updateUI();
    });

    swaySlider.addEventListener('input', (e) => {
      this.physicsConfig.swayFactor = parseFloat(e.target.value);
      valSway.textContent = `${this.physicsConfig.swayFactor.toFixed(1)}x`;
      presetBtns.forEach(b => b.classList.remove('is-active'));
      this.wakePhysics();
      updateUI();
    });

    presetBtns.forEach(btn => {
      const pName = btn.dataset.preset;
      if (!pName) return;
      btn.addEventListener('click', () => {
        presetBtns.forEach(b => {
          if (b.dataset.preset) b.classList.remove('is-active');
        });
        btn.classList.add('is-active');
        Object.assign(this.physicsConfig, presets[pName]);
        updateUI();
        for (const g of this.garments) {
          g.vel += (Math.random() - 0.5) * 0.015;
        }
        this.wakePhysics();
      });
    });

    panel.querySelector('#tuning-reset').addEventListener('click', () => {
      Object.assign(this.physicsConfig, presets.celestine);
      localStorage.removeItem('tm_hanger_physics');
      presetBtns.forEach(b => b.classList.remove('is-active'));
      panel.querySelector('[data-preset="celestine"]').classList.add('is-active');
      updateUI();
      this.wakePhysics();
    });

    panel.querySelector('#tuning-copy').addEventListener('click', (e) => {
      const jsonStr = JSON.stringify(this.physicsConfig, null, 2);
      navigator.clipboard?.writeText(jsonStr);
      const btn = e.target;
      const orig = btn.textContent;
      btn.textContent = '✓ Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1400);
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

// Global Smooth Scroll & Look Sync Helpers
window.scrollToWaitlistForm = function () {
  const formSection = document.getElementById('waitlistReservationSection');
  if (formSection) {
    formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      const nameInput = document.getElementById('waitlistFullName');
      if (nameInput) nameInput.focus();
    }, 450);
  }
};

window.selectOutfitInWaitlistOnly = function (lookTitle, index) {
  const formSection = document.getElementById('waitlistReservationSection');
  if (formSection) {
    const chips = formSection.querySelectorAll('.wl-piece-chip');
    chips.forEach((chip) => {
      const chipIdx = parseInt(chip.dataset.index, 10);
      const chipVal = (chip.dataset.value || '').toLowerCase();
      const titleVal = (lookTitle || '').toLowerCase();
      if (chipIdx === (index + 1) || (titleVal && chipVal && (chipVal.includes(titleVal) || titleVal.includes(chipVal)))) {
        chip.classList.add('is-selected');
      }
    });
  }
};

window.selectOutfitAndScrollToWaitlist = function (lookTitle, index) {
  window.selectOutfitInWaitlistOnly(lookTitle, index);
};

// Inline Waitlist Form Submission & State Controller
function initInlineWaitlistForm() {
  document.querySelectorAll('.atelier-waitlist-form').forEach((form) => {
    if (form.dataset.bound) return;
    form.dataset.bound = 'true';

    // Chip Multi-Selection
    const chips = form.querySelectorAll('.wl-piece-chip');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('is-selected');
      });
    });

    // Size Single Selection
    const sizePills = form.querySelectorAll('.wl-size-pill');
    const sizeInput = form.querySelector('input[name="preferredSize"], #waitlistPreferredSize');
    sizePills.forEach((pill) => {
      pill.addEventListener('click', () => {
        sizePills.forEach((p) => p.classList.remove('is-selected'));
        pill.classList.add('is-selected');
        if (sizeInput) sizeInput.value = pill.dataset.size || pill.textContent.trim();
      });
    });

    // Google Script Webhook Submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fullNameInput = form.querySelector('input[name="fullName"], #waitlistFullName');
      const emailInput = form.querySelector('input[name="email"], #waitlistEmail');
      const phoneInput = form.querySelector('input[name="phone"], #waitlistPhone');
      const stateInput = form.querySelector('select[name="state"], #waitlistState');

      const fullName = fullNameInput ? fullNameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const cleanPhone = phoneInput ? phoneInput.value.replace(/[^0-9]/g, '') : '';
      const state = stateInput ? stateInput.value : '';
      const size = sizeInput ? sizeInput.value : 'M';

      if (!fullName) {
        alert('Please enter your full name.');
        fullNameInput?.focus();
        return;
      }
      if (!email) {
        alert('Please enter your email.');
        emailInput?.focus();
        return;
      }
      if (cleanPhone.length < 10) {
        alert('Please enter a valid 10-digit Indian mobile number.');
        phoneInput?.focus();
        return;
      }
      if (!state) {
        alert('Please select your state.');
        stateInput?.focus();
        return;
      }

      const selectedChips = Array.from(form.querySelectorAll('.wl-piece-chip.is-selected'));
      if (selectedChips.length === 0) {
        alert('Please select at least one piece of interest.');
        return;
      }

      const selectedLooks = selectedChips.map((c) => c.dataset.value || c.textContent.trim()).join(' | ');

      const submitBtn = form.querySelector('.wl-submit-btn, #waitlistSubmitBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>SUBMITTING RESERVATION... ✦</span>';
      }

      const code = 'TB-IN-' + Math.floor(100000 + Math.random() * 900000);
      const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

      const payload = {
        code: code,
        name: fullName,
        fullName: fullName,
        email: email,
        phone: '+91 ' + cleanPhone,
        whatsapp: '+91 ' + cleanPhone,
        state: state,
        size: size,
        dresses: selectedLooks,
        selectedLooks: selectedLooks,
        looks: selectedLooks,
        date: timestamp,
        timestamp: timestamp
      };

      const webhookUrl = form.dataset.webhookUrl || 'https://script.google.com/macros/s/AKfycbyf6lJGVyB4a2kx5AY51r-IpoFmwOH5I-TN53rVPCQAk_KaJ-m34qfdKlRb9thgf5UdEg/exec';

      try {
        await fetch(webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.warn('Google Sheet Webhook dispatch:', err);
      }

      if (submitBtn) {
        submitBtn.style.display = 'none';
      }
      const successBox = form.querySelector('.wl-success-inline, #waitlistSuccessNotification');
      const details = form.querySelector('.wl-success-sub, #waitlistSuccessDetails');
      const titleEl = form.querySelector('.wl-success-title');
      if (form.dataset.successTitle && titleEl) {
        titleEl.textContent = form.dataset.successTitle;
      }
      if (successBox) {
        if (details) {
          let customMsg = form.dataset.successMsg || 'Thank you <strong>[NAME]</strong>! Your reservation code <strong>[CODE]</strong> is confirmed. We will reach out on WhatsApp/SMS with priority drop access for <em>[LOOKS]</em>.';
          customMsg = customMsg
            .replace(/\[NAME\]/g, fullName)
            .replace(/\[CODE\]/g, code)
            .replace(/\[LOOKS\]/g, selectedLooks);
          details.innerHTML = customMsg;
        }
        successBox.style.display = 'block';
      }
    });
  });
}

// Automatic Initialization for Shopify Themes
function initHangerRacks() {
  window.HangerRackInstances = window.HangerRackInstances || [];
  document.querySelectorAll('.hanger-rack-section').forEach((section) => {
    if (!section.dataset.initialized) {
      const inst = new HangerRack(section);
      window.HangerRackInstances.push(inst);
      section.__hangerRack = inst;
      section.dataset.initialized = 'true';
    }
  });
  initInlineWaitlistForm();
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
  initInlineWaitlistForm();
});
