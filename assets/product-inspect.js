/**
 * TEEKHI BELLA — PRODUCT INSPECT JS
 * Interactivity: Dynamic gallery jump, colorway swap, size selection,
 * technical drawer toggle, audio ambient toggle, and waitlist routing.
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', initProductInspect);

  function initProductInspect() {
    // Drawer elements
    const drawerBackdrop = document.getElementById('inspectDrawerBackdrop');
    const drawerPanel = document.getElementById('inspectDrawerPanel');
    const drawerTitle = document.getElementById('drawerTitle');
    const drawerBody = document.getElementById('drawerDynamicBody');
    const drawerCloseBtn = document.getElementById('drawerCloseBtn');
    const drawerTriggers = document.querySelectorAll('[data-drawer-trigger]');

    // Color & Size selection
    const colorCards = document.querySelectorAll('.color-card');
    const sizePills = document.querySelectorAll('.size-pill');
    const selectedColorLabel = document.getElementById('selectedColorLabel');
    const selectedSizeLabel = document.getElementById('selectedSizeLabel');
    const drawerSelectedColor = document.getElementById('drawerSpecColor');
    const drawerSelectedSize = document.getElementById('drawerSpecSize');

    // Quantity stepper
    const qtyMinus = document.getElementById('qtyMinus');
    const qtyPlus = document.getElementById('qtyPlus');
    const qtyVal = document.getElementById('qtyVal');
    let currentQty = 1;

    // Gallery strip jump buttons
    const stripBtns = document.querySelectorAll('.strip-thumb-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');

    // Sound toggle pill
    const soundPill = document.getElementById('inspectSoundPill');

    // Drawer Data Content dictionary
    const drawerData = {
      details: {
        title: 'Product Details',
        html: `
          <div class="drawer-content-section">
            <div class="drawer-section-heading">Silhouette & Draping</div>
            <p class="drawer-text">
              The Archival Manuscript Corset Gown is sculpted from Italian silk velvet and heavy duchess satin. The corset bodice incorporates hand-folded fan pleats inspired by historical Indian and European manuscript bindings, contoured to create a dramatic hourglass line.
            </p>
          </div>
          <div class="drawer-specs-grid">
            <div>
              <div class="spec-cell-label">Primary Fabric</div>
              <div class="spec-cell-value">Duchess Silk Satin</div>
            </div>
            <div>
              <div class="spec-cell-label">Secondary Fabric</div>
              <div class="spec-cell-value">Italian Silk Velvet</div>
            </div>
            <div>
              <div class="spec-cell-label">Corset Boning</div>
              <div class="spec-cell-value">16-Bone Architecture</div>
            </div>
            <div>
              <div class="spec-cell-label">Lining</div>
              <div class="spec-cell-value">100% Mulberry Silk</div>
            </div>
            <div>
              <div class="spec-cell-label">Edition Code</div>
              <div class="spec-cell-value">TB-ATELIER-001</div>
            </div>
            <div>
              <div class="spec-cell-label">Production Limit</div>
              <div class="spec-cell-value">25 Units Worldwide</div>
            </div>
          </div>
        `
      },
      craft: {
        title: 'Atelier Craftsmanship',
        html: `
          <div class="drawer-content-section">
            <div class="drawer-section-heading">Hand-Crafted in New Delhi</div>
            <p class="drawer-text">
              Every single gown requires upwards of 86 hours of manual labor by master artisans. Each seam is hand-basted and pressed over curved tailor hams to achieve a sculptural, seamless finish that molds to the body.
            </p>
          </div>
          <div class="drawer-content-section">
            <div class="drawer-section-heading">Internal Engineering</div>
            <p class="drawer-text">
              Features an internal waist stay (grosgrain ribbon with triple hook-and-eye closure) to support the weight of the gown from the waist rather than pulling on the shoulders or décolletage.
            </p>
          </div>
        `
      },
      washcare: {
        title: 'Washcare & Preservation',
        html: `
          <div class="drawer-content-section">
            <div class="drawer-section-heading">Professional Care Only</div>
            <p class="drawer-text">
              Specialized luxury dry clean only. Do not machine wash, do not tumble dry, do not bleach.
            </p>
          </div>
          <div class="drawer-content-section">
            <div class="drawer-section-heading">Archival Storage</div>
            <p class="drawer-text">
              Always store suspended on the provided Teekhi Bella sculptured wooden hanger within our breathable, acid-free cotton garment bag away from direct sunlight.
            </p>
          </div>
        `
      },
      delivery: {
        title: 'Complimentary White-Glove Delivery',
        html: `
          <div class="drawer-content-section">
            <div class="drawer-section-heading">India & International Dispatch</div>
            <p class="drawer-text">
              Dispatches via climate-controlled luxury express courier. Hand-delivered in our signature rigid matte packaging box with tamper-evident wax seal and personalized certificate of authenticity.
            </p>
          </div>
          <div class="drawer-content-section">
            <div class="drawer-section-heading">Private Fitting Concierge</div>
            <p class="drawer-text">
              Our atelier concierge team connects with you directly over WhatsApp upon delivery to guide fittings and assist with bespoke alterations if needed.
            </p>
          </div>
        `
      }
    };

    // Open Drawer Function
    function openDrawer(key) {
      const data = drawerData[key] || drawerData.details;
      if (drawerTitle) drawerTitle.textContent = data.title;
      if (drawerBody) drawerBody.innerHTML = data.html;

      drawerBackdrop?.classList.add('is-open');
      drawerPanel?.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    // Close Drawer Function
    function closeDrawer() {
      drawerBackdrop?.classList.remove('is-open');
      drawerPanel?.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    // Drawer Listeners
    drawerTriggers.forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const key = trigger.dataset.drawerTrigger;
        openDrawer(key);
      });
    });

    drawerCloseBtn?.addEventListener('click', closeDrawer);
    drawerBackdrop?.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
    });

    // Colorway Selection
    colorCards.forEach((card) => {
      card.addEventListener('click', () => {
        colorCards.forEach((c) => c.classList.remove('is-active'));
        card.classList.add('is-active');

        const colorName = card.dataset.colorName || 'Noir Onyx';
        if (selectedColorLabel) selectedColorLabel.textContent = colorName;
        if (drawerSelectedColor) drawerSelectedColor.textContent = colorName;

        updateReserveLink();
      });
    });

    // Size Selection
    sizePills.forEach((pill) => {
      pill.addEventListener('click', () => {
        sizePills.forEach((p) => p.classList.remove('is-active'));
        pill.classList.add('is-active');

        const size = pill.dataset.size || 'M';
        if (selectedSizeLabel) selectedSizeLabel.textContent = size;
        if (drawerSelectedSize) drawerSelectedSize.textContent = size;

        updateReserveLink();
      });
    });

    // Quantity Stepper
    qtyMinus?.addEventListener('click', () => {
      if (currentQty > 1) {
        currentQty -= 1;
        if (qtyVal) qtyVal.textContent = currentQty;
        updateReserveLink();
      }
    });

    qtyPlus?.addEventListener('click', () => {
      if (currentQty < 10) {
        currentQty += 1;
        if (qtyVal) qtyVal.textContent = currentQty;
        updateReserveLink();
      }
    });

    // Gallery Strip Navigation
    stripBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.targetId;
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // Scroll spy for gallery items to highlight active thumbnail
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const id = entry.target.id;
              stripBtns.forEach((b) => {
                b.classList.toggle('is-active', b.dataset.targetId === id);
              });
            }
          });
        },
        { threshold: 0.5 }
      );

      galleryItems.forEach((item) => observer.observe(item));
    }

    // Dynamic Waitlist Link Updater
    function updateReserveLink() {
      const reserveBtn = document.getElementById('btnReserveWaitlist');
      if (!reserveBtn) return;

      const activeColor = document.querySelector('.color-card.is-active')?.dataset.colorName || 'Noir';
      const activeSize = document.querySelector('.size-pill.is-active')?.dataset.size || 'M';
      const lookTitle = document.getElementById('productInspectTitle')?.textContent?.trim() || 'Archival Manuscript Corset Gown';

      const url = `waitlist.html?look=${encodeURIComponent(lookTitle)}&color=${encodeURIComponent(activeColor)}&size=${encodeURIComponent(activeSize)}&qty=${currentQty}`;
      reserveBtn.setAttribute('href', url);
    }

    updateReserveLink();

    // Ambient Sound Toggle
    let isPlaying = false;
    let audioCtx = null;

    soundPill?.addEventListener('click', () => {
      isPlaying = !isPlaying;
      soundPill.classList.toggle('is-playing', isPlaying);

      const label = soundPill.querySelector('.pill-label');
      if (label) {
        label.textContent = isPlaying ? 'Atelier Sound: Active ✦' : 'Atelier Audio';
      }

      // Gentle ambient chime synthesizer
      try {
        if (!audioCtx) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          audioCtx = new AudioContext();
        }
        if (isPlaying && audioCtx.state === 'suspended') {
          audioCtx.resume();
        }

        if (isPlaying) {
          playAtelierChime();
        }
      } catch (e) {}
    });

    function playAtelierChime() {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(432, audioCtx.currentTime); // 432Hz harmonic tone
      osc.frequency.exponentialRampToValueAtTime(864, audioCtx.currentTime + 1.2);

      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
    }
  }
})();
