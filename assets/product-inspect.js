/**
 * CVNT — Product Detail Experience JavaScript
 * 1:1 Parity with https://cvnt.in/product/skirt
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', initCVNTExperience);

  function initCVNTExperience() {
    // 1. Audio / Meow
    const meowAudio = new Audio(window.__cvntMeowAudioUrl || 'assets/cat-meow.mp3');
    const meowButtons = document.querySelectorAll('.MeowButton_button__GaaqF, .ProductDetailExperience_meowButtonViewport__Ql2VU, .ProductDetailExperience_meowButtonSlider__nA63E');
    meowButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        try {
          meowAudio.currentTime = 0;
          meowAudio.play().catch(() => {});
        } catch (_) {}
      });
    });

    // 2. Media Gallery & Miniatures Sync
    const slides = document.querySelectorAll('.ProductDetailExperience_mediaSlide__b9fgy');
    const miniatures = document.querySelectorAll('.ProductDetailExperience_miniatureButton__bPKNm');
    const miniatureCadre = document.querySelector('.ProductDetailExperience_miniatureCadre__QCU44');
    const indicatorCount = document.querySelector('.ProductDetailExperience_mediaIndicatorCount__d6Zih');
    const indicatorDots = document.querySelectorAll('.ProductDetailExperience_mediaIndicatorDot__qRHzC');

    let activeMediaIndex = 0;

    function setMediaIndex(index) {
      if (index < 0 || index >= slides.length) return;
      activeMediaIndex = index;

      // Update indicator counter
      if (indicatorCount) {
        indicatorCount.innerHTML = `${index + 1}<!-- --> / <!-- -->${slides.length}`;
      }

      // Update dots
      indicatorDots.forEach((dot, idx) => {
        dot.classList.toggle('ProductDetailExperience_mediaIndicatorDotActive__0LD8H', idx === index);
      });

      // Update cadre position
      if (miniatureCadre) {
        miniatureCadre.classList.add('ProductDetailExperience_miniatureCadreReady__uMwNQ');
        miniatureCadre.style.transform = `translateY(${index * 75}px)`;
        miniatureCadre.classList.toggle('ProductDetailExperience_miniatureCadreStart__0xMl8', index === 0);
        miniatureCadre.classList.toggle('ProductDetailExperience_miniatureCadreEnd__mpw3U', index === slides.length - 1);
      }
    }

    miniatures.forEach((mini, idx) => {
      mini.addEventListener('click', () => {
        if (slides[idx]) {
          slides[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setMediaIndex(idx);
      });
    });

    // Observer for scroll spy on slides
    if ('IntersectionObserver' in window && slides.length > 0) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = parseInt(entry.target.getAttribute('data-index') || '0', 10);
            setMediaIndex(idx);
          }
        });
      }, { threshold: 0.5 });

      slides.forEach(slide => observer.observe(slide));
    }

    // Initial cadre state
    setMediaIndex(0);

    // 3. Swatch / Colorway Selection
    const swatchButtons = document.querySelectorAll('.ProductDetailExperience_colorThumbButton__2sQvm');
    let selectedColor = 'Black';

    swatchButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        swatchButtons.forEach(b => {
          b.classList.remove('ProductDetailExperience_colorThumbButtonCurrent__SHQDx');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('ProductDetailExperience_colorThumbButtonCurrent__SHQDx');
        btn.setAttribute('aria-pressed', 'true');

        const nameEl = btn.querySelector('.ProductDetailExperience_colorThumbName__7LlrB');
        if (nameEl) {
          selectedColor = nameEl.textContent.trim();
        }
      });
    });

    // 4. Size Pill Selection
    const sizeRadios = document.querySelectorAll('.ProductDetailExperience_variantInput__TQjTe[name="size"]');
    const sizeLabels = document.querySelectorAll('.ProductDetailExperience_variantLabel__VkJns');
    let selectedSize = 'XS';

    sizeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        sizeLabels.forEach(l => l.classList.remove('ProductDetailExperience_variantLabelChecked__2YDWo'));
        const label = document.querySelector(`label[for="${radio.id}"]`);
        if (label) {
          label.classList.add('ProductDetailExperience_variantLabelChecked__2YDWo');
        }
        selectedSize = radio.value.toUpperCase();
      });
    });

    // 5. Quantity Stepper
    let quantity = 1;
    const qtyValue = document.querySelector('.ProductDetailExperience_quantityValue__JeJ09');
    const qtyButtons = document.querySelectorAll('.ProductDetailExperience_quantityButton__6Nxre');
    const qtyMinus = qtyButtons[0];
    const qtyPlus = qtyButtons[1];

    if (qtyMinus && qtyPlus && qtyValue) {
      qtyMinus.addEventListener('click', () => {
        if (quantity > 1) {
          quantity -= 1;
          qtyValue.textContent = quantity;
        }
        qtyMinus.disabled = quantity <= 1;
      });

      qtyPlus.addEventListener('click', () => {
        if (quantity < 10) {
          quantity += 1;
          qtyValue.textContent = quantity;
        }
        qtyMinus.disabled = quantity <= 1;
      });
    }

    // 6. Buy Now / Waitlist Routing
    const buyNowButtons = document.querySelectorAll('.ProductDetailExperience_buyNowButton__6tiNm, .ProductDetailExperience_stickyBuyNowButton__LHziO, .ProductDetailExperience_addToCartButton__egkl6');
    buyNowButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const url = `waitlist.html?look=cvnt%27s%20genda%20phool%20skirt&color=${encodeURIComponent(selectedColor)}&size=${encodeURIComponent(selectedSize)}&qty=${quantity}`;
        window.location.href = url;
      });
    });

    // 7. Slide-out Drawer Component (Exact CVNT Behavior & Content)
    const drawerRoot = document.getElementById('cvntDrawerRoot');
    const drawerScrim = document.getElementById('cvntDrawerScrim');
    const drawerPanel = document.getElementById('cvntDrawerPanel');
    const drawerTitle = document.getElementById('cvntDrawerTitle');
    const drawerBody = document.getElementById('cvntDrawerBody');
    const drawerClose = document.getElementById('cvntDrawerClose');
    const pageSurface = document.querySelector('.ProductDetailExperience_pageSurface__LIloS');

    // Drawer Data Definitions
    const sizeGuideData = {
      units: 'inches',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      rows: [
        {
          key: 'waist',
          label: 'WAIST',
          inches: ['23-25', '26-28', '29-31', '32-34', '35-37'],
          cm: ['58.4-63.5', '66.0-71.1', '73.7-78.7', '81.3-86.4', '88.9-94.0']
        },
        {
          key: 'lowerWaist',
          label: 'LOWER WAIST',
          inches: ['27-29', '30-32', '33-35', '36-38', '39-41'],
          cm: ['68.6-73.7', '76.2-81.3', '83.8-88.9', '91.4-96.5', '99.1-104.1']
        },
        {
          key: 'hip',
          label: 'HIP',
          inches: ['32-33', '34-36', '37-39', '40-42', '43-44'],
          cm: ['81.3-83.8', '86.4-91.4', '94.0-99.1', '101.6-106.7', '109.2-111.8']
        },
        {
          key: 'skirtLength',
          label: 'SKIRT LENGTH',
          inches: ['10', '11', '11', '12', '13'],
          cm: ['25.4', '27.9', '27.9', '30.5', '33.0']
        }
      ]
    };

    function renderSizeGuideHtml(unit) {
      const isCm = unit === 'cm';
      const colWidths = sizeGuideData.sizes.map(() => `<col class="ProductDetailExperience_sizeGuideValueColumn__i_uJm">`).join('');
      const headers = sizeGuideData.sizes.map(s => `<th>${s}</th>`).join('');
      
      const rowsHtml = sizeGuideData.rows.map(row => {
        const values = isCm ? row.cm : row.inches;
        const tds = values.map(v => `<td>${v}</td>`).join('');
        return `
          <tr>
            <th scope="row">${row.label}</th>
            ${tds}
          </tr>
        `;
      }).join('');

      return `
        <div class="ProductDetailExperience_sizeGuideShell__ycsSk">
          <div class="ProductDetailExperience_sizeGuideUnitToggle__W9ako" role="tablist" aria-label="Size guide units">
            <span class="ProductDetailExperience_sizeGuideUnitToggleIndicator__PKtY_" aria-hidden="true" data-unit="${unit}"></span>
            <button type="button" role="tab" aria-selected="${!isCm}" class="ProductDetailExperience_sizeGuideUnitButton__GeRj3 ${!isCm ? 'ProductDetailExperience_sizeGuideUnitButtonActive__sDU7c' : ''}" data-unit-btn="inches">inches</button>
            <button type="button" role="tab" aria-selected="${isCm}" class="ProductDetailExperience_sizeGuideUnitButton__GeRj3 ${isCm ? 'ProductDetailExperience_sizeGuideUnitButtonActive__sDU7c' : ''}" data-unit-btn="cm">cm</button>
          </div>
          <div class="ProductDetailExperience_sizeGuideMatrixWrap__o2Ro1">
            <table class="ProductDetailExperience_sizeGuideMatrix__P93yk">
              <colgroup>
                <col class="ProductDetailExperience_sizeGuideLabelColumn__SEEbX">
                ${colWidths}
              </colgroup>
              <thead>
                <tr>
                  <th aria-hidden="true"></th>
                  ${headers}
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    const drawerContents = {
      'details': {
        title: 'Product details',
        isSizeGuide: false,
        html: `
          <section class="ProductDetailExperience_drawerSection__UWR7M">
            <h3 class="ProductDetailExperience_drawerSectionTitle__QyY5C">cvnt's genda phool skirt</h3>
            <div class="ProductDetailExperience_drawerSectionBody__Iwl44">
              <p>The ruffles of the skirt is inspired by the petals of marigold flower (genda phool). It's made from Duchess Satin.</p>
            </div>
          </section>
        `
      },
      'construction': {
        title: 'Construction',
        isSizeGuide: false,
        html: `
          <section class="ProductDetailExperience_drawerSection__UWR7M">
            <h3 class="ProductDetailExperience_drawerSectionTitle__QyY5C">Fabric</h3>
            <div class="ProductDetailExperience_drawerSectionBody__Iwl44">
              <p>duchess satin.</p>
            </div>
          </section>
        `
      },
      'size-guide': {
        title: 'Size guide',
        isSizeGuide: true,
        getHtml: (unit) => renderSizeGuideHtml(unit)
      },
      'shipping': {
        title: 'Shipping and returns',
        isSizeGuide: false,
        html: `
          <section class="ProductDetailExperience_drawerSection__UWR7M">
            <h3 class="ProductDetailExperience_drawerSectionTitle__QyY5C">Shipping</h3>
            <div class="ProductDetailExperience_drawerSectionBody__Iwl44">
              <p>Packed within 24 hours.</p>
              <p>Dispatches next day.</p>
              <p>Can take 7-14 days depending on the location.</p>
            </div>
          </section>
          <section class="ProductDetailExperience_drawerSection__UWR7M">
            <h3 class="ProductDetailExperience_drawerSectionTitle__QyY5C">Returns</h3>
            <div class="ProductDetailExperience_drawerSectionBody__Iwl44">
              <p>Replacements/Returns/Store Credit available subject to an error reported within 7 days of delivery.</p>
            </div>
          </section>
        `
      },
      'care': {
        title: 'Care',
        isSizeGuide: false,
        html: `
          <section class="ProductDetailExperience_drawerSection__UWR7M">
            <h3 class="ProductDetailExperience_drawerSectionTitle__QyY5C">Care</h3>
            <div class="ProductDetailExperience_drawerSectionBody__Iwl44">
              <p>Hand wash with cold water or dry clean only.</p>
            </div>
          </section>
        `
      }
    };

    let currentDrawerKey = null;
    let currentSizeGuideUnit = 'inches';

    function attachSizeGuideEvents() {
      const unitButtons = drawerBody.querySelectorAll('[data-unit-btn]');
      unitButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const targetUnit = btn.getAttribute('data-unit-btn');
          if (targetUnit !== currentSizeGuideUnit) {
            currentSizeGuideUnit = targetUnit;
            drawerBody.innerHTML = renderSizeGuideHtml(currentSizeGuideUnit);
            attachSizeGuideEvents();
          }
        });
      });
    }

    function openDrawer(key) {
      const customEl = document.getElementById('cvnt-drawer-' + key);
      let data = drawerContents[key];
      if (customEl && customEl.innerHTML.trim().length > 0) {
        const customTitle = customEl.getAttribute('data-drawer-title');
        data = {
          title: customTitle || (drawerContents[key] ? drawerContents[key].title : key),
          isSizeGuide: key === 'size-guide',
          html: customEl.innerHTML,
          getHtml: drawerContents[key] ? drawerContents[key].getHtml : null
        };
      }
      if (!data) return;

      currentDrawerKey = key;
      drawerTitle.textContent = data.title;

      if (data.isSizeGuide) {
        drawerPanel.classList.add('ProductDetailExperience_overlayPanelSizeGuide__e3fMY');
        drawerBody.innerHTML = data.getHtml(currentSizeGuideUnit);
        attachSizeGuideEvents();
      } else {
        drawerPanel.classList.remove('ProductDetailExperience_overlayPanelSizeGuide__e3fMY');
        drawerBody.innerHTML = data.html;
      }

      // Display root container
      drawerRoot.style.display = 'block';

      // Animate open
      requestAnimationFrame(() => {
        drawerScrim.classList.add('ProductDetailExperience_overlayScrimVisible__7les_');
        drawerPanel.classList.add('ProductDetailExperience_overlayPanelOpen__8bTxe');
        if (pageSurface) {
          pageSurface.classList.add('ProductDetailExperience_pageSurfaceBlurred__4S5ur');
        }
        document.body.style.overflow = 'hidden';
      });
    }

    function closeDrawer() {
      drawerScrim.classList.remove('ProductDetailExperience_overlayScrimVisible__7les_');
      drawerPanel.classList.remove('ProductDetailExperience_overlayPanelOpen__8bTxe');
      if (pageSurface) {
        pageSurface.classList.remove('ProductDetailExperience_pageSurfaceBlurred__4S5ur');
      }
      document.body.style.overflow = '';

      setTimeout(() => {
        drawerRoot.style.display = 'none';
        drawerPanel.classList.remove('ProductDetailExperience_overlayPanelSizeGuide__e3fMY');
        currentDrawerKey = null;
      }, 280);
    }

    // Detail button clicks
    const detailButtons = document.querySelectorAll('.ProductDetailExperience_detailButton__nHj7N');
    detailButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.textContent.toLowerCase();
        let key = 'details';
        if (text.includes('construction')) key = 'construction';
        else if (text.includes('size')) key = 'size-guide';
        else if (text.includes('shipping')) key = 'shipping';
        else if (text.includes('care')) key = 'care';
        openDrawer(key);
      });
    });

    drawerClose?.addEventListener('click', closeDrawer);
    drawerScrim?.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && currentDrawerKey) {
        closeDrawer();
      }
    });

    // Sticky basket visibility on scroll
    const stickyBasket = document.querySelector('.ProductDetailExperience_stickyBasket__R7gj_');
    const buyButtonsContainer = document.querySelector('.ProductDetailExperience_buyButtons__mEvEC');
    if (stickyBasket && buyButtonsContainer && 'IntersectionObserver' in window) {
      const basketObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) {
            stickyBasket.classList.add('ProductDetailExperience_stickyBasketVisible__Vz_mL');
            stickyBasket.style.display = 'flex';
          } else {
            stickyBasket.classList.remove('ProductDetailExperience_stickyBasketVisible__Vz_mL');
            stickyBasket.style.display = 'none';
          }
        });
      }, { threshold: 0 });

      basketObserver.observe(buyButtonsContainer);
    }

    // Auto-open drawer if requested via URL param (e.g. ?open=size-guide or ?open=details)
    const urlParams = new URLSearchParams(window.location.search);
    const initialOpen = urlParams.get('open');
    if (initialOpen && drawerContents[initialOpen]) {
      setTimeout(() => openDrawer(initialOpen), 80);
    }
  }
})();
